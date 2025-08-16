
export interface MarketDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PredictionData {
  date: Date;
  predictedPrice: number;
  actualPrice?: number;
  direction: 'UP' | 'DOWN';
  confidence: number;
  isCorrect?: boolean;
  ichimokuSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsiValue: number;
}

export interface PerformanceData {
  date: Date;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  avgConfidence: number;
  profitLoss?: number;
  maxDrawdown?: number;
  winRate?: number;
}

export function generateMarketData(days: number = 90): MarketDataPoint[] {
  const data: MarketDataPoint[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  let currentPrice = 195.50; // Starting around current GBP/JPY levels
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const volatility = 0.005 + Math.random() * 0.015;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const change = currentPrice * volatility * direction;
    
    const open = currentPrice;
    const close = currentPrice + change;
    
    const spread = Math.abs(change) + (currentPrice * 0.002 * Math.random());
    const high = Math.max(open, close) + spread * Math.random();
    const low = Math.min(open, close) - spread * Math.random();
    
    data.push({
      date,
      open: Number(open.toFixed(3)),
      high: Number(high.toFixed(3)),
      low: Number(low.toFixed(3)),
      close: Number(close.toFixed(3)),
      volume: Math.floor(1000000 + Math.random() * 5000000)
    });
    
    currentPrice = close;
  }
  
  return data;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function generateIchimokuSignal(prices: number[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (prices.length < 26) return 'NEUTRAL';
  
  const currentPrice = prices[prices.length - 1];
  const tenkanSen = (Math.max(...prices.slice(-9)) + Math.min(...prices.slice(-9))) / 2;
  const kijunSen = (Math.max(...prices.slice(-26)) + Math.min(...prices.slice(-26))) / 2;
  
  if (currentPrice > tenkanSen && tenkanSen > kijunSen) return 'BULLISH';
  if (currentPrice < tenkanSen && tenkanSen < kijunSen) return 'BEARISH';
  return 'NEUTRAL';
}

export function generatePredictions(marketData: MarketDataPoint[]): PredictionData[] {
  const predictions: PredictionData[] = [];
  const prices = marketData.map(d => d.close);
  
  for (let i = 26; i < marketData.length; i++) {
    const currentData = marketData[i];
    const historicalPrices = prices.slice(0, i + 1);
    
    const rsiValue = calculateRSI(historicalPrices);
    const ichimokuSignal = generateIchimokuSignal(historicalPrices);
    
    let direction: 'UP' | 'DOWN';
    let confidence: number;
    
    if (ichimokuSignal === 'BULLISH' && rsiValue < 70) {
      direction = 'UP';
      confidence = 0.65 + Math.random() * 0.25;
    } else if (ichimokuSignal === 'BEARISH' && rsiValue > 30) {
      direction = 'DOWN';
      confidence = 0.65 + Math.random() * 0.25;
    } else {
      direction = Math.random() > 0.5 ? 'UP' : 'DOWN';
      confidence = 0.5 + Math.random() * 0.3;
    }
    
    const currentPrice = currentData.close;
    const priceChange = (Math.random() - 0.5) * currentPrice * 0.02; // ±2% max
    const predictedPrice = currentPrice + (direction === 'UP' ? Math.abs(priceChange) : -Math.abs(priceChange));
    
    let actualPrice: number | undefined;
    let isCorrect: boolean | undefined;
    
    if (i < marketData.length - 1) {
      actualPrice = marketData[i + 1].close;
      const actualDirection = actualPrice > currentPrice ? 'UP' : 'DOWN';
      isCorrect = direction === actualDirection;
    }
    
    predictions.push({
      date: currentData.date,
      predictedPrice: Number(predictedPrice.toFixed(3)),
      actualPrice: actualPrice ? Number(actualPrice.toFixed(3)) : undefined,
      direction,
      confidence: Number(confidence.toFixed(3)),
      isCorrect,
      ichimokuSignal,
      rsiValue: Number(rsiValue.toFixed(2))
    });
  }
  
  return predictions;
}

export function generatePerformanceData(predictions: PredictionData[]): PerformanceData[] {
  const performance: PerformanceData[] = [];
  let cumulativeCorrect = 0;
  let cumulativeTotal = 0;
  let cumulativePnL = 0;
  let maxDrawdown = 0;
  let peakPnL = 0;
  
  predictions.forEach((pred, index) => {
    if (pred.isCorrect !== undefined) {
      cumulativeTotal++;
      if (pred.isCorrect) cumulativeCorrect++;
      
      const pnl = pred.isCorrect ? pred.confidence * 100 : -pred.confidence * 100;
      cumulativePnL += pnl;
      
      if (cumulativePnL > peakPnL) {
        peakPnL = cumulativePnL;
      }
      const currentDrawdown = peakPnL - cumulativePnL;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
      
      if (index % 7 === 0 && cumulativeTotal > 0) {
        const accuracy = (cumulativeCorrect / cumulativeTotal) * 100;
        const avgConfidence = predictions
          .slice(0, index + 1)
          .reduce((sum, p) => sum + p.confidence, 0) / (index + 1);
        
        performance.push({
          date: pred.date,
          accuracy: Number(accuracy.toFixed(2)),
          totalPredictions: cumulativeTotal,
          correctPredictions: cumulativeCorrect,
          avgConfidence: Number(avgConfidence.toFixed(3)),
          profitLoss: Number(cumulativePnL.toFixed(2)),
          maxDrawdown: Number(maxDrawdown.toFixed(2)),
          winRate: Number(((cumulativeCorrect / cumulativeTotal) * 100).toFixed(2))
        });
      }
    }
  });
  
  return performance;
}

export function generateCompleteDataset(days: number = 90) {
  const marketData = generateMarketData(days);
  const predictions = generatePredictions(marketData);
  const performance = generatePerformanceData(predictions);
  
  return {
    marketData,
    predictions,
    performance
  };
}
