import { ForexDataService } from './forex-api';
import { generatePredictions, generatePerformanceData } from './dummy-data';
import type { MarketDataPoint, PredictionData, PerformanceData } from './dummy-data';

const forexService = new ForexDataService(process.env.ALPHA_VANTAGE_API_KEY);

export async function getMarketData(days: number = 365): Promise<MarketDataPoint[]> {
  return await forexService.getHistoricalData(days);
}

export async function getCurrentPrice(): Promise<number> {
  return await forexService.getCurrentPrice();
}

export async function getCompleteDataset(days: number = 365) {
  const marketData = await getMarketData(days);
  const predictions = generatePredictions(marketData);
  const performance = generatePerformanceData(predictions);
  
  return {
    marketData,
    predictions,
    performance
  };
}

export { type MarketDataPoint, type PredictionData, type PerformanceData };
