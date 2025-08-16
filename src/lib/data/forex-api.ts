export interface AlphaVantageResponse {
  'Meta Data': {
    '1. Information': string;
    '2. From Symbol': string;
    '3. To Symbol': string;
    '4. Output Size': string;
    '5. Last Refreshed': string;
    '6. Time Zone': string;
  };
  'Time Series (FX Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
    };
  };
}

import type { MarketDataPoint } from './dummy-data';

export interface ForexDataProvider {
  getCurrentPrice(): Promise<number>;
  getHistoricalData(days: number): Promise<MarketDataPoint[]>;
  isAvailable(): Promise<boolean>;
}

export class AlphaVantageProvider implements ForexDataProvider {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private cache = new Map<string, { data: MarketDataPoint[]; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCurrentPrice(): Promise<number> {
    const data = await this.getHistoricalData(1);
    return data[data.length - 1]?.close || 0;
  }

  async getHistoricalData(days: number = 365): Promise<MarketDataPoint[]> {
    const cacheKey = `fx_daily_${days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const outputSize = days > 100 ? 'full' : 'compact';
      const url = `${this.baseUrl}?function=FX_DAILY&from_symbol=GBP&to_symbol=JPY&outputsize=${outputSize}&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      const data: AlphaVantageResponse = await response.json();
      
      if (!data['Time Series (FX Daily)']) {
        throw new Error('Invalid API response or rate limit exceeded');
      }

      const marketData = this.transformToMarketData(data, days);
      this.cache.set(cacheKey, { data: marketData, timestamp: Date.now() });
      
      return marketData;
    } catch (error) {
      console.error('Alpha Vantage API error:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=GBP&to_currency=JPY&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      return !data['Error Message'] && !data['Information'];
    } catch {
      return false;
    }
  }

  private transformToMarketData(data: AlphaVantageResponse, days: number): MarketDataPoint[] {
    const timeSeries = data['Time Series (FX Daily)'];
    const entries = Object.entries(timeSeries)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-days);

    return entries.map(([dateStr, values]) => ({
      date: new Date(dateStr),
      open: Number(values['1. open']),
      high: Number(values['2. high']),
      low: Number(values['3. low']),
      close: Number(values['4. close']),
      volume: Math.floor(1000000 + Math.random() * 5000000)
    }));
  }
}

export class DummyDataProvider implements ForexDataProvider {
  async getCurrentPrice(): Promise<number> {
    const data = await this.getHistoricalData(1);
    return data[data.length - 1]?.close || 195.50;
  }

  async getHistoricalData(days: number): Promise<MarketDataPoint[]> {
    const { generateMarketData } = await import('./dummy-data');
    return generateMarketData(days);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export class ForexDataService {
  private primaryProvider: ForexDataProvider;
  private fallbackProvider: ForexDataProvider;

  constructor(apiKey?: string) {
    this.primaryProvider = apiKey ? new AlphaVantageProvider(apiKey) : new DummyDataProvider();
    this.fallbackProvider = new DummyDataProvider();
  }

  async getHistoricalData(days: number = 365): Promise<MarketDataPoint[]> {
    try {
      if (await this.primaryProvider.isAvailable()) {
        return await this.primaryProvider.getHistoricalData(days);
      }
    } catch (error) {
      console.warn('Primary forex provider failed, using fallback:', error);
    }
    
    return await this.fallbackProvider.getHistoricalData(days);
  }

  async getCurrentPrice(): Promise<number> {
    try {
      if (await this.primaryProvider.isAvailable()) {
        return await this.primaryProvider.getCurrentPrice();
      }
    } catch (error) {
      console.warn('Primary forex provider failed for current price, using fallback:', error);
    }
    
    return await this.fallbackProvider.getCurrentPrice();
  }
}
