export interface AssetConfig {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  sparkline: number[];
  color: string;
  badgeBg: string;
  iconSvg?: string;
  isFavorite?: boolean;
  prediction: {
    direction: 'YES' | 'NO';
    targetPrice: number;
    confidence: number;
    edgePct: number;
    tradeGrade: 'A+' | 'A' | 'B' | 'SKIP';
    modelProb: number;
    marketProb: number;
    reasoning: string;
    keyFactors: string[];
  };
  orderFlow: {
    bullVolumePct: number;
    bearVolumePct: number;
    netDelta: string;
    takerBuyRatio: number;
    bidCushionPct: number;
    bookPressureScore: number;
  };
  whales: Array<{
    id: string;
    timeAgo: string;
    type: 'BUY' | 'SELL';
    size: string;
    usdValue: string;
    venue: string;
    impact: string;
  }>;
  patterns: Array<{
    id: string;
    name: string;
    category: 'Bullish' | 'Bearish' | 'Microstructure' | 'Experimental';
    confidence: number;
    accuracy: number;
    age: string;
    description: string;
  }>;
  venues: {
    kalshiYes: number;
    kalshiNo: number;
    polymarketYes: number;
    polymarketNo: number;
    draftKingsYes: string;
    draftKingsNo: string;
    bestEdgeVenue: 'Kalshi' | 'Polymarket' | 'DraftKings';
    bestEdgeValue: number;
  };
}

export const ASSET_DATABASE: Record<string, AssetConfig> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 64161.40,
    change24h: 3.42,
    high24h: 64850.00,
    low24h: 63210.00,
    volume24h: '28,410.5 BTC',
    sparkline: [63200, 63450, 63100, 63800, 63650, 64000, 64161],
    color: '#F7931A',
    badgeBg: 'rgba(247, 147, 26, 0.15)',
    isFavorite: true,
    prediction: {
      direction: 'YES',
      targetPrice: 64313,
      confidence: 91,
      edgePct: 12.2,
      tradeGrade: 'A+',
      modelProb: 64.2,
      marketProb: 52.0,
      reasoning: 'L2 Net Taker Buy Delta +1,467 BTC with zero fill slippage on Kalshi $64k strike.',
      keyFactors: [
        'Institutional Limit Bids absorbed 120 BTC market sell wall',
        'CVD Delta divergence expanding rapidly upwards',
        '9/21 EMA golden cross on 15M candles',
      ],
    },
    orderFlow: {
      bullVolumePct: 68.4,
      bearVolumePct: 31.6,
      netDelta: '+1,467 BTC',
      takerBuyRatio: 2.16,
      bidCushionPct: 18.4,
      bookPressureScore: 88,
    },
    whales: [
      {
        id: 'w1',
        timeAgo: '12s ago',
        type: 'BUY',
        size: '18.4 BTC',
        usdValue: '$1,180,560',
        venue: 'Binance / Kalshi Bridge',
        impact: 'High Absorption',
      },
      {
        id: 'w2',
        timeAgo: '1m ago',
        type: 'BUY',
        size: '34.2 BTC',
        usdValue: '$2,194,320',
        venue: 'Coinbase Pro',
        impact: 'Sweep Ask Wall',
      },
      {
        id: 'w3',
        timeAgo: '3m ago',
        type: 'BUY',
        size: '12.0 BTC',
        usdValue: '$769,930',
        venue: 'Deribit Options Block',
        impact: 'Call Strike Cushion',
      },
    ],
    patterns: [
      {
        id: 'p1',
        name: 'Bullish Absorption',
        category: 'Bullish',
        confidence: 94,
        accuracy: 88,
        age: '14s ago',
        description: 'Heavy limit bid wall absorbed aggressive market sell orders near VWAP.',
      },
      {
        id: 'p2',
        name: 'Whale Accumulation',
        category: 'Bullish',
        confidence: 92,
        accuracy: 86,
        age: '42s ago',
        description: 'Block trades >$1.2M executed on taker buys with zero slippage.',
      },
      {
        id: 'p3',
        name: 'Spoofing Pulled',
        category: 'Experimental',
        confidence: 78,
        accuracy: 75,
        age: '2m ago',
        description: 'Large 45 BTC ask wall repeatedly pulled 2 ticks before price interaction.',
      },
    ],
    venues: {
      kalshiYes: 0.54,
      kalshiNo: 0.46,
      polymarketYes: 52.0,
      polymarketNo: 48.0,
      draftKingsYes: '-115',
      draftKingsNo: '+105',
      bestEdgeVenue: 'Kalshi',
      bestEdgeValue: 12.2,
    },
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3482.50,
    change24h: 4.85,
    high24h: 3520.00,
    low24h: 3310.00,
    volume24h: '184,200 ETH',
    sparkline: [3310, 3340, 3380, 3420, 3400, 3460, 3482],
    color: '#627EEA',
    badgeBg: 'rgba(98, 126, 234, 0.15)',
    isFavorite: true,
    prediction: {
      direction: 'YES',
      targetPrice: 3515,
      confidence: 94,
      edgePct: 15.8,
      tradeGrade: 'A+',
      modelProb: 68.8,
      marketProb: 53.0,
      reasoning: 'Massive staking inflow (+48,000 ETH) combined with options gamma squeeze above $3,450.',
      keyFactors: [
        'Layer-2 Gas usage hit 30-day high',
        'Polymarket implied probabilities underpricing breakout by 15.8%',
        'Cumulative Taker Buy Delta +$14.2M on Coinbase',
      ],
    },
    orderFlow: {
      bullVolumePct: 74.2,
      bearVolumePct: 25.8,
      netDelta: '+12,450 ETH',
      takerBuyRatio: 2.87,
      bidCushionPct: 22.1,
      bookPressureScore: 92,
    },
    whales: [
      {
        id: 'ew1',
        timeAgo: '8s ago',
        type: 'BUY',
        size: '420.0 ETH',
        usdValue: '$1,462,650',
        venue: 'Uniswap v3 TWAP',
        impact: 'Institutional Sweep',
      },
      {
        id: 'ew2',
        timeAgo: '2m ago',
        type: 'BUY',
        size: '850.0 ETH',
        usdValue: '$2,960,125',
        venue: 'Kraken Institutional',
        impact: 'Ask Liquidation',
      },
    ],
    patterns: [
      {
        id: 'ep1',
        name: 'Gamma Squeeze Breakout',
        category: 'Bullish',
        confidence: 96,
        accuracy: 91,
        age: '8s ago',
        description: 'Call option market makers forced to spot-hedge rapidly above $3,450 strike.',
      },
      {
        id: 'ep2',
        name: 'Delta Divergence Peak',
        category: 'Microstructure',
        confidence: 89,
        accuracy: 84,
        age: '1m ago',
        description: 'Persistent market buy orders absorbing limit sell resting liquidity.',
      },
    ],
    venues: {
      kalshiYes: 0.53,
      kalshiNo: 0.47,
      polymarketYes: 51.5,
      polymarketNo: 48.5,
      draftKingsYes: '-110',
      draftKingsNo: '+100',
      bestEdgeVenue: 'Polymarket',
      bestEdgeValue: 15.8,
    },
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    price: 184.20,
    change24h: 8.12,
    high24h: 188.50,
    low24h: 168.00,
    volume24h: '1,420,000 SOL',
    sparkline: [168, 172, 170, 178, 181, 180, 184],
    color: '#14F195',
    badgeBg: 'rgba(20, 241, 149, 0.15)',
    isFavorite: true,
    prediction: {
      direction: 'YES',
      targetPrice: 189.50,
      confidence: 95,
      edgePct: 18.4,
      tradeGrade: 'A+',
      modelProb: 72.4,
      marketProb: 54.0,
      reasoning: 'DeFi DEX volume record spike. High-frequency arbitrage bots driving continuous taker buy momentum.',
      keyFactors: [
        'Jito MEV validator tips reached daily ATH',
        'Cross-exchange order book spread tightened to 0.2¢',
        'Aggressive short squeeze in progress across Bybit',
      ],
    },
    orderFlow: {
      bullVolumePct: 79.1,
      bearVolumePct: 20.9,
      netDelta: '+88,400 SOL',
      takerBuyRatio: 3.78,
      bidCushionPct: 26.5,
      bookPressureScore: 96,
    },
    whales: [
      {
        id: 'sw1',
        timeAgo: '5s ago',
        type: 'BUY',
        size: '12,500 SOL',
        usdValue: '$2,302,500',
        venue: 'Raydium Route',
        impact: 'Massive Buy Sweep',
      },
      {
        id: 'sw2',
        timeAgo: '45s ago',
        type: 'BUY',
        size: '8,200 SOL',
        usdValue: '$1,510,440',
        venue: 'Bybit Derivatives',
        impact: 'Short Liquidation Cascade',
      },
    ],
    patterns: [
      {
        id: 'sp1',
        name: 'Short Squeeze Cascade',
        category: 'Bullish',
        confidence: 97,
        accuracy: 93,
        age: '5s ago',
        description: 'Forced liquidation buy-backs cascading across major perp exchanges.',
      },
      {
        id: 'sp2',
        name: 'Velocity Surge',
        category: 'Microstructure',
        confidence: 93,
        accuracy: 88,
        age: '30s ago',
        description: 'Taker buy trades per second increased 340% over baseline.',
      },
    ],
    venues: {
      kalshiYes: 0.55,
      kalshiNo: 0.45,
      polymarketYes: 54.0,
      polymarketNo: 46.0,
      draftKingsYes: '-125',
      draftKingsNo: '+115',
      bestEdgeVenue: 'Polymarket',
      bestEdgeValue: 18.4,
    },
  },
  XRP: {
    symbol: 'XRP',
    name: 'Ripple',
    price: 0.6240,
    change24h: 1.85,
    high24h: 0.6410,
    low24h: 0.6080,
    volume24h: '410,000,000 XRP',
    sparkline: [0.608, 0.612, 0.610, 0.618, 0.622, 0.620, 0.624],
    color: '#23292F',
    badgeBg: 'rgba(255, 255, 255, 0.1)',
    isFavorite: false,
    prediction: {
      direction: 'YES',
      targetPrice: 0.6380,
      confidence: 84,
      edgePct: 7.6,
      tradeGrade: 'A',
      modelProb: 59.6,
      marketProb: 52.0,
      reasoning: 'Steady accumulation by cross-border liquidity nodes.',
      keyFactors: [
        'RLUSD stablecoin testing activity rising',
        'Order book depth neutral to slightly bullish (+6.2%)',
      ],
    },
    orderFlow: {
      bullVolumePct: 58.2,
      bearVolumePct: 41.8,
      netDelta: '+4,200,000 XRP',
      takerBuyRatio: 1.39,
      bidCushionPct: 12.4,
      bookPressureScore: 74,
    },
    whales: [
      {
        id: 'xw1',
        timeAgo: '4m ago',
        type: 'BUY',
        size: '1,500,000 XRP',
        usdValue: '$936,000',
        venue: 'Bitstamp ODL',
        impact: 'Institutional Fill',
      },
    ],
    patterns: [
      {
        id: 'xp1',
        name: 'ODL Demand Compression',
        category: 'Microstructure',
        confidence: 82,
        accuracy: 79,
        age: '4m ago',
        description: 'Steady baseline liquidity requests absorbing resistance bids.',
      },
    ],
    venues: {
      kalshiYes: 0.52,
      kalshiNo: 0.48,
      polymarketYes: 51.0,
      polymarketNo: 49.0,
      draftKingsYes: '-105',
      draftKingsNo: '-105',
      bestEdgeVenue: 'Kalshi',
      bestEdgeValue: 7.6,
    },
  },
  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.1420,
    change24h: 6.40,
    high24h: 0.1480,
    low24h: 0.1310,
    volume24h: '980,000,000 DOGE',
    sparkline: [0.131, 0.134, 0.132, 0.138, 0.141, 0.139, 0.142],
    color: '#C2A633',
    badgeBg: 'rgba(194, 166, 51, 0.15)',
    isFavorite: false,
    prediction: {
      direction: 'YES',
      targetPrice: 0.1465,
      confidence: 89,
      edgePct: 11.4,
      tradeGrade: 'A',
      modelProb: 63.4,
      marketProb: 52.0,
      reasoning: 'Social sentiment momentum surge aligned with massive retail market order sweeps.',
      keyFactors: [
        'Open Interest jumped +$18M in 1 hour',
        'Net Taker Buy Volume +18.4M DOGE',
      ],
    },
    orderFlow: {
      bullVolumePct: 69.5,
      bearVolumePct: 30.5,
      netDelta: '+24,800,000 DOGE',
      takerBuyRatio: 2.28,
      bidCushionPct: 16.8,
      bookPressureScore: 86,
    },
    whales: [
      {
        id: 'dw1',
        timeAgo: '1m ago',
        type: 'BUY',
        size: '8,500,000 DOGE',
        usdValue: '$1,207,000',
        venue: 'Binance Spot',
        impact: 'Retail Momentum Sweep',
      },
    ],
    patterns: [
      {
        id: 'dp1',
        name: 'Social Sentiment Impulse',
        category: 'Bullish',
        confidence: 88,
        accuracy: 83,
        age: '1m ago',
        description: 'Rapid influx of market buy orders following volume acceleration.',
      },
    ],
    venues: {
      kalshiYes: 0.53,
      kalshiNo: 0.47,
      polymarketYes: 52.5,
      polymarketNo: 47.5,
      draftKingsYes: '-110',
      draftKingsNo: '+100',
      bestEdgeVenue: 'Polymarket',
      bestEdgeValue: 11.4,
    },
  },
  ADA: {
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.4180,
    change24h: 2.10,
    high24h: 0.4280,
    low24h: 0.4050,
    volume24h: '120,000,000 ADA',
    sparkline: [0.405, 0.410, 0.408, 0.414, 0.416, 0.415, 0.418],
    color: '#0033AD',
    badgeBg: 'rgba(0, 51, 173, 0.15)',
    isFavorite: false,
    prediction: {
      direction: 'YES',
      targetPrice: 0.4240,
      confidence: 82,
      edgePct: 6.2,
      tradeGrade: 'B',
      modelProb: 58.2,
      marketProb: 52.0,
      reasoning: 'Steady accumulation with moderate buy cushion.',
      keyFactors: [
        'Staking ratio stable at 64.2%',
        'Order book bid depth +8.1% over ask depth',
      ],
    },
    orderFlow: {
      bullVolumePct: 56.4,
      bearVolumePct: 43.6,
      netDelta: '+2,100,000 ADA',
      takerBuyRatio: 1.29,
      bidCushionPct: 10.2,
      bookPressureScore: 71,
    },
    whales: [
      {
        id: 'aw1',
        timeAgo: '6m ago',
        type: 'BUY',
        size: '1,800,000 ADA',
        usdValue: '$752,400',
        venue: 'Coinbase Pro',
        impact: 'Limit Fill',
      },
    ],
    patterns: [
      {
        id: 'ap1',
        name: 'Baseline VWAP Hold',
        category: 'Microstructure',
        confidence: 80,
        accuracy: 77,
        age: '6m ago',
        description: 'Price finding steady support along 21-period EMA.',
      },
    ],
    venues: {
      kalshiYes: 0.52,
      kalshiNo: 0.48,
      polymarketYes: 51.0,
      polymarketNo: 49.0,
      draftKingsYes: '-105',
      draftKingsNo: '-105',
      bestEdgeVenue: 'Kalshi',
      bestEdgeValue: 6.2,
    },
  },
  SUI: {
    symbol: 'SUI',
    name: 'Sui Network',
    price: 1.845,
    change24h: 7.20,
    high24h: 1.920,
    low24h: 1.710,
    volume24h: '48,000,000 SUI',
    sparkline: [1.71, 1.74, 1.78, 1.80, 1.82, 1.81, 1.845],
    color: '#4DA2FF',
    badgeBg: 'rgba(77, 162, 255, 0.15)',
    isFavorite: false,
    prediction: {
      direction: 'YES',
      targetPrice: 1.910,
      confidence: 88,
      edgePct: 10.4,
      tradeGrade: 'A',
      modelProb: 62.4,
      marketProb: 52.0,
      reasoning: 'Ecosystem TVL expansion and high-speed execution volume surge.',
      keyFactors: [
        'DEX volume up +38% in 24 hours',
        'Continuous taker buy delta absorbing limit asks',
      ],
    },
    orderFlow: {
      bullVolumePct: 66.8,
      bearVolumePct: 33.2,
      netDelta: '+3,400,000 SUI',
      takerBuyRatio: 2.01,
      bidCushionPct: 15.2,
      bookPressureScore: 84,
    },
    whales: [
      {
        id: 'sw1_sui',
        timeAgo: '2m ago',
        type: 'BUY',
        size: '450,000 SUI',
        usdValue: '$830,250',
        venue: 'Binance Spot',
        impact: 'Aggressive Sweep',
      },
    ],
    patterns: [
      {
        id: 'sp1_sui',
        name: 'High-Throughput Surge',
        category: 'Bullish',
        confidence: 89,
        accuracy: 85,
        age: '2m ago',
        description: 'Accelerated spot volume breaking local resistance.',
      },
    ],
    venues: {
      kalshiYes: 0.53,
      kalshiNo: 0.47,
      polymarketYes: 52.0,
      polymarketNo: 48.0,
      draftKingsYes: '-110',
      draftKingsNo: '+100',
      bestEdgeVenue: 'Polymarket',
      bestEdgeValue: 10.4,
    },
  },
  AVAX: {
    symbol: 'AVAX',
    name: 'Avalanche',
    price: 28.60,
    change24h: 3.80,
    high24h: 29.40,
    low24h: 27.20,
    volume24h: '4,200,000 AVAX',
    sparkline: [27.2, 27.5, 27.9, 28.1, 28.4, 28.3, 28.6],
    color: '#E84142',
    badgeBg: 'rgba(232, 65, 66, 0.15)',
    isFavorite: false,
    prediction: {
      direction: 'YES',
      targetPrice: 29.25,
      confidence: 85,
      edgePct: 8.2,
      tradeGrade: 'A',
      modelProb: 60.2,
      marketProb: 52.0,
      reasoning: 'Subnet activity expansion and institutional bridge inflows.',
      keyFactors: [
        'Corporate subnet deployment announcement',
        'Positive net taker delta on Coinbase Pro',
      ],
    },
    orderFlow: {
      bullVolumePct: 61.5,
      bearVolumePct: 38.5,
      netDelta: '+180,000 AVAX',
      takerBuyRatio: 1.60,
      bidCushionPct: 13.8,
      bookPressureScore: 78,
    },
    whales: [
      {
        id: 'aw1_avax',
        timeAgo: '5m ago',
        type: 'BUY',
        size: '35,000 AVAX',
        usdValue: '$1,001,000',
        venue: 'Coinbase Institutional',
        impact: 'Institutional Fill',
      },
    ],
    patterns: [
      {
        id: 'ap1_avax',
        name: 'Subnet Flow Impulse',
        category: 'Microstructure',
        confidence: 84,
        accuracy: 81,
        age: '5m ago',
        description: 'Persistent limit buy stacking above daily VWAP.',
      },
    ],
    venues: {
      kalshiYes: 0.52,
      kalshiNo: 0.48,
      polymarketYes: 51.5,
      polymarketNo: 48.5,
      draftKingsYes: '-105',
      draftKingsNo: '-105',
      bestEdgeVenue: 'Polymarket',
      bestEdgeValue: 8.2,
    },
  },
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    price: 15.20,
    change24h: 4.10,
    high24h: 15.80,
    low24h: 14.50,
    volume24h: '8,900,000 LINK',
    sparkline: [14.5, 14.8, 14.9, 15.1, 15.0, 15.3, 15.2],
    color: '#375BD2',
    badgeBg: 'rgba(55, 91, 210, 0.15)',
    isFavorite: false,
    prediction: {
      direction: 'YES',
      targetPrice: 15.65,
      confidence: 86,
      edgePct: 9.0,
      tradeGrade: 'A',
      modelProb: 61.0,
      marketProb: 52.0,
      reasoning: 'CCIP cross-chain settlement volume growth driving steady token demand.',
      keyFactors: [
        'Oracle data feed requests hit weekly high',
        'Taker buy ratio 1.74 with deep bid cushion',
      ],
    },
    orderFlow: {
      bullVolumePct: 63.4,
      bearVolumePct: 36.6,
      netDelta: '+410,000 LINK',
      takerBuyRatio: 1.74,
      bidCushionPct: 14.2,
      bookPressureScore: 80,
    },
    whales: [
      {
        id: 'lw1_link',
        timeAgo: '3m ago',
        type: 'BUY',
        size: '60,000 LINK',
        usdValue: '$912,000',
        venue: 'Kraken Pro',
        impact: 'Order Book Absorption',
      },
    ],
    patterns: [
      {
        id: 'lp1_link',
        name: 'Oracle Demand Support',
        category: 'Bullish',
        confidence: 86,
        accuracy: 82,
        age: '3m ago',
        description: 'Order flow consolidation with ascending minimum bid floors.',
      },
    ],
    venues: {
      kalshiYes: 0.52,
      kalshiNo: 0.48,
      polymarketYes: 51.8,
      polymarketNo: 48.2,
      draftKingsYes: '-105',
      draftKingsNo: '-105',
      bestEdgeVenue: 'Polymarket',
      bestEdgeValue: 9.0,
    },
  },
  NEAR: {
    symbol: 'NEAR',
    name: 'NEAR Protocol',
    price: 5.42,
    change24h: 5.90,
    high24h: 5.65,
    low24h: 5.05,
    volume24h: '22,000,000 NEAR',
    sparkline: [5.05, 5.15, 5.25, 5.30, 5.45, 5.38, 5.42],
    color: '#A855F7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    isFavorite: false,
    prediction: {
      direction: 'YES',
      targetPrice: 5.60,
      confidence: 87,
      edgePct: 9.8,
      tradeGrade: 'A',
      modelProb: 61.8,
      marketProb: 52.0,
      reasoning: 'User-owned AI narratives fueling strong transaction growth.',
      keyFactors: [
        'Active daily wallets up +22%',
        'Order flow imbalance +16.2% bid heavy',
      ],
    },
    orderFlow: {
      bullVolumePct: 65.1,
      bearVolumePct: 34.9,
      netDelta: '+1,250,000 NEAR',
      takerBuyRatio: 1.86,
      bidCushionPct: 15.0,
      bookPressureScore: 82,
    },
    whales: [
      {
        id: 'nw1_near',
        timeAgo: '7m ago',
        type: 'BUY',
        size: '180,000 NEAR',
        usdValue: '$975,600',
        venue: 'Binance Spot',
        impact: 'Volume Acceleration',
      },
    ],
    patterns: [
      {
        id: 'np1_near',
        name: 'AI Agent Narrative Squeeze',
        category: 'Bullish',
        confidence: 87,
        accuracy: 83,
        age: '7m ago',
        description: 'Rising open interest paired with spot premium.',
      },
    ],
    venues: {
      kalshiYes: 0.52,
      kalshiNo: 0.48,
      polymarketYes: 52.0,
      polymarketNo: 48.0,
      draftKingsYes: '-110',
      draftKingsNo: '+100',
      bestEdgeVenue: 'Polymarket',
      bestEdgeValue: 9.8,
    },
  },
  BNB: {
    symbol: 'BNB',
    name: 'BNB Chain',
    price: 588.40,
    change24h: 2.30,
    high24h: 595.00,
    low24h: 574.00,
    volume24h: '520,000 BNB',
    sparkline: [574, 578, 582, 585, 590, 586, 588.4],
    color: '#F3BA2F',
    badgeBg: 'rgba(243, 186, 47, 0.15)',
    isFavorite: false,
    prediction: {
      direction: 'YES',
      targetPrice: 594.00,
      confidence: 83,
      edgePct: 6.8,
      tradeGrade: 'A',
      modelProb: 58.8,
      marketProb: 52.0,
      reasoning: 'Launchpool staking lockup reducing circulating supply on spot order books.',
      keyFactors: [
        'Quarterly burn dynamic tightening available depth',
        'Consistent limit buyer absorption near $580 support',
      ],
    },
    orderFlow: {
      bullVolumePct: 57.8,
      bearVolumePct: 42.2,
      netDelta: '+18,400 BNB',
      takerBuyRatio: 1.37,
      bidCushionPct: 11.4,
      bookPressureScore: 73,
    },
    whales: [
      {
        id: 'bw1_bnb',
        timeAgo: '9m ago',
        type: 'BUY',
        size: '1,500 BNB',
        usdValue: '$882,600',
        venue: 'Binance Institutional',
        impact: 'Limit Bid Block',
      },
    ],
    patterns: [
      {
        id: 'bp1_bnb',
        name: 'Supply Lock Absorption',
        category: 'Microstructure',
        confidence: 82,
        accuracy: 79,
        age: '9m ago',
        description: 'Low-slippage block absorption along 50-period EMA.',
      },
    ],
    venues: {
      kalshiYes: 0.51,
      kalshiNo: 0.49,
      polymarketYes: 51.0,
      polymarketNo: 49.0,
      draftKingsYes: '-105',
      draftKingsNo: '-105',
      bestEdgeVenue: 'Polymarket',
      bestEdgeValue: 6.8,
    },
  },
};

/**
 * Returns an AssetConfig dynamically resolved from canonical identity
 */
export function getAssetConfigByQuery(queryOrSymbol: string): AssetConfig {
  const clean = (queryOrSymbol || 'BTC').toUpperCase().trim();
  if (ASSET_DATABASE[clean]) {
    return ASSET_DATABASE[clean];
  }
  // Try resolving by symbol or construct fallback
  const firstMatch = Object.values(ASSET_DATABASE).find(
    (a) => a.symbol.toUpperCase() === clean || a.name.toUpperCase() === clean
  );
  if (firstMatch) return firstMatch;
  return ASSET_DATABASE.BTC;
}

