export interface VolumeData {
  volumeMA: number;
  volumeOscillator: number;
  volumeTrend: 'INCREASING' | 'DECREASING' | 'NEUTRAL';
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export function calculateVolumeMA(volumes: number[], period: number = 20): number {
  if (volumes.length < period) {
    return volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  }
  
  const recentVolumes = volumes.slice(-period);
  return recentVolumes.reduce((sum, vol) => sum + vol, 0) / period;
}

export function calculateVolumeOscillator(
  volumes: number[], 
  shortPeriod: number = 5, 
  longPeriod: number = 10
): number {
  if (volumes.length < longPeriod) return 0;
  
  const shortMA = calculateVolumeMA(volumes, shortPeriod);
  const longMA = calculateVolumeMA(volumes, longPeriod);
  
  if (longMA === 0) return 0;
  
  return ((shortMA - longMA) / longMA) * 100;
}

export function calculateVolumeAnalysis(
  volumes: number[], 
  prices: number[]
): VolumeData | null {
  if (volumes.length < 10 || prices.length < 10) {
    return null;
  }
  
  const volumeMA = calculateVolumeMA(volumes);
  const volumeOscillator = calculateVolumeOscillator(volumes);
  
  const volumeTrend = determineVolumeTrend(volumes);
  const signal = generateVolumeSignal(volumes, prices, volumeOscillator, volumeTrend);
  
  return {
    volumeMA: Number(volumeMA.toFixed(0)),
    volumeOscillator: Number(volumeOscillator.toFixed(2)),
    volumeTrend,
    signal
  };
}

export function determineVolumeTrend(volumes: number[]): 'INCREASING' | 'DECREASING' | 'NEUTRAL' {
  if (volumes.length < 5) return 'NEUTRAL';
  
  const recentVolumes = volumes.slice(-5);
  const firstHalf = recentVolumes.slice(0, 2);
  const secondHalf = recentVolumes.slice(-2);
  
  const firstAvg = firstHalf.reduce((sum, vol) => sum + vol, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, vol) => sum + vol, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (changePercent > 10) {
    return 'INCREASING';
  } else if (changePercent < -10) {
    return 'DECREASING';
  } else {
    return 'NEUTRAL';
  }
}

export function generateVolumeSignal(
  volumes: number[],
  prices: number[],
  volumeOscillator: number,
  volumeTrend: 'INCREASING' | 'DECREASING' | 'NEUTRAL'
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (volumes.length < 2 || prices.length < 2) return 'NEUTRAL';
  
  const currentVolume = volumes[volumes.length - 1];
  const volumeMA = calculateVolumeMA(volumes);
  const currentPrice = prices[prices.length - 1];
  const previousPrice = prices[prices.length - 2];
  
  const priceDirection = currentPrice > previousPrice ? 'UP' : 'DOWN';
  const volumeAboveAverage = currentVolume > volumeMA;
  
  if (priceDirection === 'UP' && volumeAboveAverage && volumeTrend === 'INCREASING') {
    return 'BULLISH';
  } else if (priceDirection === 'DOWN' && volumeAboveAverage && volumeTrend === 'INCREASING') {
    return 'BEARISH';
  } else if (volumeOscillator > 20) {
    return priceDirection === 'UP' ? 'BULLISH' : 'BEARISH';
  } else if (volumeOscillator < -20) {
    return 'NEUTRAL';
  } else {
    return 'NEUTRAL';
  }
}

export function calculateVolumeSeries(
  volumes: number[], 
  prices: number[]
): VolumeData[] {
  const results: VolumeData[] = [];
  
  for (let i = 20; i <= Math.min(volumes.length, prices.length); i++) {
    const volumeSubset = volumes.slice(0, i);
    const priceSubset = prices.slice(0, i);
    const volumeData = calculateVolumeAnalysis(volumeSubset, priceSubset);
    if (volumeData) {
      results.push(volumeData);
    }
  }
  
  return results;
}
