export interface Position {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  sparkline: number[];
}

export interface Signal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  timestamp: string;
  status: 'active' | 'hit_tp' | 'hit_sl' | 'pending';
  confidence: number;
  aiInsight?: string;
  technicalReason?: string;
}

export interface AccountData {
  balance: number;
  equity: number;
  floatingPL: number;
  marginLevel: number;
  usedMargin: number;
  freeMargin: number;
  dailyDrawdown: number;
  maxDailyDrawdown: number;
  maxAccountDrawdown: number;
  currentAccountDrawdown: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Generate sparkline data
const generateSparkline = (base: number, volatility: number, points: number = 24): number[] => {
  const data: number[] = [];
  let current = base;
  for (let i = 0; i < points; i++) {
    current += (Math.random() - 0.48) * volatility;
    data.push(current);
  }
  return data;
};

// Generate candlestick data
export const generateCandlestickData = (base: number, volatility: number, count: number = 50): CandleData[] => {
  const data: CandleData[] = [];
  let current = base;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const open = current;
    const change1 = (Math.random() - 0.5) * volatility;
    const change2 = (Math.random() - 0.5) * volatility;
    const high = Math.max(open + Math.abs(change1), open + Math.abs(change2));
    const low = Math.min(open - Math.abs(change1), open - Math.abs(change2));
    const close = open + (Math.random() - 0.48) * volatility;
    current = close;

    data.push({
      time: now - (count - i) * 60000,
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
      volume: Math.floor(Math.random() * 10000) + 1000,
    });
  }
  return data;
};

export const mockPositions: Position[] = [
  {
    id: '1',
    symbol: 'EUR/USD',
    type: 'BUY',
    lots: 1.5,
    openPrice: 1.0842,
    currentPrice: 1.0879,
    profit: 555.0,
    sparkline: generateSparkline(1.0842, 0.002),
  },
  {
    id: '2',
    symbol: 'GBP/USD',
    type: 'SELL',
    lots: 0.8,
    openPrice: 1.2715,
    currentPrice: 1.2698,
    profit: 136.0,
    sparkline: generateSparkline(1.2715, 0.003),
  },
  {
    id: '3',
    symbol: 'USD/JPY',
    type: 'BUY',
    lots: 2.0,
    openPrice: 149.85,
    currentPrice: 149.62,
    profit: -306.0,
    sparkline: generateSparkline(149.85, 0.5),
  },
  {
    id: '4',
    symbol: 'XAU/USD',
    type: 'BUY',
    lots: 0.5,
    openPrice: 2345.50,
    currentPrice: 2358.20,
    profit: 635.0,
    sparkline: generateSparkline(2345.5, 10),
  },
  {
    id: '5',
    symbol: 'AUD/USD',
    type: 'SELL',
    lots: 1.2,
    openPrice: 0.6518,
    currentPrice: 0.6534,
    profit: -192.0,
    sparkline: generateSparkline(0.6518, 0.001),
  },
];

export const mockAccount: AccountData = {
  balance: 52480.75,
  equity: 53308.75,
  floatingPL: 828.0,
  marginLevel: 1842.5,
  usedMargin: 2893.12,
  freeMargin: 50415.63,
  dailyDrawdown: 2.3,
  maxDailyDrawdown: 5.0,
  maxAccountDrawdown: 10.0,
  currentAccountDrawdown: 3.8,
};

export const mockSignals: Signal[] = [
  {
    id: '1',
    symbol: 'EUR/USD',
    type: 'BUY',
    entry: 1.0855,
    sl: 1.0820,
    tp: 1.0920,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    status: 'active',
    confidence: 87,
    technicalReason: 'RSI Divergence + Support Bounce',
  },
  {
    id: '2',
    symbol: 'GBP/USD',
    type: 'SELL',
    entry: 1.2720,
    sl: 1.2765,
    tp: 1.2650,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: 'active',
    confidence: 74,
    technicalReason: 'Double Top Rejection at Resistance',
  },
  {
    id: '3',
    symbol: 'XAU/USD',
    type: 'BUY',
    entry: 2342.00,
    sl: 2325.00,
    tp: 2380.00,
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    status: 'hit_tp',
    confidence: 91,
    technicalReason: 'Ascending Triangle Breakout',
  },
  {
    id: '4',
    symbol: 'USD/JPY',
    type: 'SELL',
    entry: 150.20,
    sl: 150.80,
    tp: 149.20,
    timestamp: new Date(Date.now() - 28800000).toISOString(),
    status: 'active',
    confidence: 68,
    technicalReason: 'Overbought RSI + Trendline Resistance',
  },
  {
    id: '5',
    symbol: 'AUD/USD',
    type: 'BUY',
    entry: 0.6510,
    sl: 0.6480,
    tp: 0.6570,
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    status: 'hit_sl',
    confidence: 62,
    technicalReason: 'Moving Average Crossover',
  },
  {
    id: '6',
    symbol: 'NZD/USD',
    type: 'BUY',
    entry: 0.5985,
    sl: 0.5955,
    tp: 0.6040,
    timestamp: new Date(Date.now() - 57600000).toISOString(),
    status: 'pending',
    confidence: 79,
    technicalReason: 'Bullish Engulfing at Key Support',
  },
];

export const assetPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'AUD/USD', 'NZD/USD'];

export const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
export type Timeframe = typeof timeframes[number];
