export interface FibonacciData {
  swingHigh: number;
  swingLow: number;
  levels: {
    level236: number;
    level382: number;
    level500: number;
    level618: number;
    level786: number;
  };
  signal: 'SUPPORT' | 'RESISTANCE' | 'NEUTRAL';
}

export function findSwingPoints(
  prices: { high: number; low: number; close: number }[], 
  lookback: number = 20
): { high: number; low: number } {
  if (prices.length < lookback) {
    const highs = prices.map(p => p.high);
    const lows = prices.map(p => p.low);
    return {
      high: Math.max(...highs),
      low: Math.min(...lows)
    };
  }
  
  const recentPrices = prices.slice(-lookback);
  const highs = recentPrices.map(p => p.high);
  const lows = recentPrices.map(p => p.low);
  
  return {
    high: Math.max(...highs),
    low: Math.min(...lows)
  };
}

export function calculateFibonacci(
  prices: { high: number; low: number; close: number }[]
): FibonacciData | null {
  if (prices.length < 10) {
    return null;
  }
  
  const { high: swingHigh, low: swingLow } = findSwingPoints(prices);
  const range = swingHigh - swingLow;
  
  const levels = {
    level236: swingHigh - (range * 0.236),
    level382: swingHigh - (range * 0.382),
    level500: swingHigh - (range * 0.500),
    level618: swingHigh - (range * 0.618),
    level786: swingHigh - (range * 0.786)
  };
  
  const currentPrice = prices[prices.length - 1].close;
  const signal = generateFibonacciSignal(currentPrice, levels, swingHigh, swingLow);
  
  return {
    swingHigh: Number(swingHigh.toFixed(3)),
    swingLow: Number(swingLow.toFixed(3)),
    levels: {
      level236: Number(levels.level236.toFixed(3)),
      level382: Number(levels.level382.toFixed(3)),
      level500: Number(levels.level500.toFixed(3)),
      level618: Number(levels.level618.toFixed(3)),
      level786: Number(levels.level786.toFixed(3))
    },
    signal
  };
}

export function generateFibonacciSignal(
  currentPrice: number,
  levels: {
    level236: number;
    level382: number;
    level500: number;
    level618: number;
    level786: number;
  },
  swingHigh: number,
  swingLow: number
): 'SUPPORT' | 'RESISTANCE' | 'NEUTRAL' {
  const tolerance = (swingHigh - swingLow) * 0.01;
  
  const nearLevel = (level: number) => Math.abs(currentPrice - level) <= tolerance;
  
  if (nearLevel(levels.level236) || nearLevel(levels.level382) || 
      nearLevel(levels.level500) || nearLevel(levels.level618) || 
      nearLevel(levels.level786)) {
    
    if (currentPrice < levels.level500) {
      return 'SUPPORT';
    } else {
      return 'RESISTANCE';
    }
  }
  
  if (currentPrice <= swingLow + tolerance) {
    return 'SUPPORT';
  } else if (currentPrice >= swingHigh - tolerance) {
    return 'RESISTANCE';
  }
  
  return 'NEUTRAL';
}

export function calculateFibonacciSeries(
  prices: { high: number; low: number; close: number }[]
): FibonacciData[] {
  const results: FibonacciData[] = [];
  
  for (let i = 20; i <= prices.length; i++) {
    const subset = prices.slice(0, i);
    const fibonacci = calculateFibonacci(subset);
    if (fibonacci) {
      results.push(fibonacci);
    }
  }
  
  return results;
}
