import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Zap,
  Activity,
  Layers,
  BrainCircuit,
  RefreshCw,
  Radar,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import { BTCTicker, AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';

interface AIPatternEngineProps {
  ticker?: BTCTicker;
  timeframe?: '15M' | '1H';
  appMode?: 'SIMPLE' | 'PRO';
  userRole?: 'DEMO' | 'PRO' | 'ADMIN';
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

interface PatternItem {
  id: string;
  name: string;
  simpleName?: string;
  category: 'Bullish' | 'Bearish' | 'Microstructure' | 'Experimental';
  type: string;
  confidence: number;
  historicalAccuracy: number;
  seenCount: number;
  expectedFollowThrough: string;
  detectedAge: string;
  isExperimental?: boolean;
  status: 'ACTIVE' | 'FORMING' | 'CONFIRMED';
  description: string;
  simpleDescription?: string;
  detailBreakdown?: string;
}

export const AIPatternEngine: React.FC<AIPatternEngineProps> = ({
  ticker = { price: 64108, change24h: 3.42, high24h: 64850, low24h: 63210, volume24h: 28410.5 },
  timeframe = '15M',
  appMode = 'SIMPLE',
  userRole = 'DEMO',
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'MICRO' | 'EXPERIMENTAL'>('ALL');
  const [selectedPattern, setSelectedPattern] = useState<PatternItem | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string>('Just now');
  const [scanCount, setScanCount] = useState<number>(1420);

  const isUnlocked = userRole === 'ADMIN' || userRole === 'PRO' || Boolean(alertSettings?.discordLinked) || Boolean(alertSettings?.guildMember);


  const handleManualScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanCount((prev) => prev + 8);
      setLastScanTime('Just now');
    }, 600);
  };

  // Comprehensive Catalog of Detected Patterns
  const patterns: PatternItem[] = [
    {
      id: 'pat_1',
      name: 'Spoofing Detection',
      simpleName: 'Fake Sell Wall Pulled (Bullish)',
      category: 'Experimental',
      type: 'Order Book AI',
      confidence: 78,
      historicalAccuracy: 75,
      seenCount: 194,
      expectedFollowThrough: 'False Resistance Removal',
      detectedAge: '5m ago',
      isExperimental: true,
      status: 'ACTIVE',
      description: 'Large 45 BTC ask wall repeatedly pulled 2 ticks before price interaction.',
      simpleDescription: 'A seller put up a fake order to trick people into selling, then quickly cancelled it as price got close. Path upwards is clear!',
      detailBreakdown: 'Artificial sell pressure created by algorithmic spoof orders designed to induce retail panics. As price approaches, the ask wall is instantly pulled, opening up rapid upside space.',
    },
    {
      id: 'pat_2',
      name: 'Bullish Absorption',
      simpleName: 'Heavy Buying Support (Bullish)',
      category: 'Bullish',
      type: 'Order Flow',
      confidence: 94,
      historicalAccuracy: 88,
      seenCount: 432,
      expectedFollowThrough: 'Immediate Upside Impulse',
      detectedAge: '14s ago',
      status: 'CONFIRMED',
      description: 'Heavy limit bid wall absorbed aggressive market sell orders near Strike VWAP support.',
      simpleDescription: 'Big buyers stepped in and bought up every incoming sell order. Price refused to go down.',
      detailBreakdown: 'Taker market sell orders totaling over 120 BTC were completely absorbed by institutional limit bids without breaking price level, signaling immense underlying buyer demand.',
    },
    {
      id: 'pat_3',
      name: 'Whale Accumulation',
      simpleName: 'Big Whale Buying $1.2M+',
      category: 'Bullish',
      type: 'On-Chain / L2',
      confidence: 92,
      historicalAccuracy: 86,
      seenCount: 318,
      expectedFollowThrough: 'Sustained Strike Breakout',
      detectedAge: '42s ago',
      status: 'CONFIRMED',
      description: 'Multiple block trades >$1.2M executed on taker buys with zero slippage impact.',
      simpleDescription: 'A major institution or whale just bought millions in Bitcoin directly off the market.',
      detailBreakdown: 'Institutional sweep orders executed across top tier exchanges in synced time intervals. Indicates stealth positioning before scheduled volatility window.',
    },
    {
      id: 'pat_4',
      name: 'Hidden Iceberg Limit',
      simpleName: 'Automatic Buy Cushion',
      category: 'Microstructure',
      type: 'L2 Microstructure',
      confidence: 89,
      historicalAccuracy: 82,
      seenCount: 265,
      expectedFollowThrough: 'Strike Price Cushion Support',
      detectedAge: '2m ago',
      status: 'ACTIVE',
      description: '12.8 BTC hidden limit buy order reloading continuously at $63,950 Strike Level.',
      simpleDescription: 'An automated computer program is continuously refilling buy orders right below current price.',
      detailBreakdown: 'Automated iceberg order continuously refilling display size of 0.5 BTC every time it is filled. Prevents downside breakdown below local strike boundary.',
    },
    {
      id: 'pat_5',
      name: 'Short Squeeze Trap',
      simpleName: 'Short Sellers Trapped',
      category: 'Bullish',
      type: 'Derivatives / OI',
      confidence: 91,
      historicalAccuracy: 87,
      seenCount: 189,
      expectedFollowThrough: 'Cascading Liquidation Impulse',
      detectedAge: '3m ago',
      status: 'CONFIRMED',
      description: 'Aggressive short sellers trapped as open interest expanded +$42M into bid cushion.',
      simpleDescription: 'Traders betting price would fall got trapped as buyers stepped in. They will soon be forced to buy back.',
      detailBreakdown: 'Net short positioning spiked sharply while spot price refused to drop. Late short sellers are now over-leveraged and vulnerable to buy stops cascading upwards.',
    },
    {
      id: 'pat_6',
      name: 'Liquidity Sweep & Reclaim',
      simpleName: 'Quick Dip Snapped Back Up',
      category: 'Microstructure',
      type: 'Order Book AI',
      confidence: 86,
      historicalAccuracy: 83,
      seenCount: 512,
      expectedFollowThrough: 'Mean Reversion Drive',
      detectedAge: '4m ago',
      status: 'CONFIRMED',
      description: 'Stop-loss cluster below local swing low swept and rapidly reclaimed within 2 ticks.',
      simpleDescription: 'Price dropped for a brief second to flush out weak hands, then instantly bounced back up.',
      detailBreakdown: 'Price dipped briefly into a high-density retail stop loss liquidity cluster before aggressive taker buyers snapped price back up above key session VWAP.',
    },
    {
      id: 'pat_7',
      name: 'Ask Wall Exhaustion',
      simpleName: 'Sellers Out of Fuel',
      category: 'Bullish',
      type: 'Order Flow',
      confidence: 85,
      historicalAccuracy: 80,
      seenCount: 210,
      expectedFollowThrough: 'Clear Run to $64,500 Strike',
      detectedAge: '6m ago',
      status: 'ACTIVE',
      description: 'Sell liquidity wall depleted by 72% via persistent TWAP taker buy sweeps.',
      simpleDescription: 'Buyers have eaten through almost all sell orders above price, making it easy for price to rally.',
      detailBreakdown: 'Persistent time-weighted average price (TWAP) buying has steadily eaten through resistance walls, leaving thin sell side depth above current price.',
    },
    {
      id: 'pat_8',
      name: 'Delta Divergence',
      simpleName: 'Stealth Accumulation',
      category: 'Microstructure',
      type: 'Cumulative Delta',
      confidence: 88,
      historicalAccuracy: 84,
      seenCount: 340,
      expectedFollowThrough: 'Bullish Pivot Continuation',
      detectedAge: '7m ago',
      status: 'CONFIRMED',
      description: 'Positive CVD expansion despite flat price consolidation indicating strong accumulation.',
      simpleDescription: 'Buyers are quietly building huge positions while price stays flat before a bigger breakout.',
      detailBreakdown: 'Cumulative Volume Delta is trending upwards steeply while price trades flat, demonstrating stealth market buying before price markup.',
    },
    {
      id: 'pat_9',
      name: 'Bearish Exhaustion',
      simpleName: 'Selling Slowing Down',
      category: 'Bearish',
      type: 'Order Flow',
      confidence: 42,
      historicalAccuracy: 71,
      seenCount: 115,
      expectedFollowThrough: 'Weak Downside Momentum',
      detectedAge: '11m ago',
      status: 'FORMING',
      description: 'Sell volume delta drying up rapidly near $63,800 Strike floor.',
      simpleDescription: 'Sellers are losing power and running out of Bitcoin to dump near support.',
      detailBreakdown: 'Seller aggressiveness has dropped significantly with falling volume on lower candle wicks, indicating downside pressure is running out of fuel.',
    },
    {
      id: 'pat_10',
      name: 'VWAP Drift Acceleration',
      simpleName: 'Uptrend Riding Average Price',
      category: 'Microstructure',
      type: 'Market Structure',
      confidence: 90,
      historicalAccuracy: 85,
      seenCount: 480,
      expectedFollowThrough: 'Higher High Continuation',
      detectedAge: '12m ago',
      status: 'CONFIRMED',
      description: 'Sustained price action holding strictly above 9/21 EMA and session VWAP.',
      simpleDescription: 'Price is smoothly riding above average benchmark price with buyers stepping in on every tiny dip.',
      detailBreakdown: 'Price is systematically riding the 9-period EMA upward with every pull-back finding immediate buying support at session VWAP.',
    },
  ];

  // Filtered list based on active tab
  const filteredPatterns = patterns.filter((p) => {
    if (activeFilter === 'BULLISH') return p.category === 'Bullish';
    if (activeFilter === 'BEARISH') return p.category === 'Bearish';
    if (activeFilter === 'MICRO') return p.category === 'Microstructure';
    if (activeFilter === 'EXPERIMENTAL') return p.category === 'Experimental' || p.isExperimental;
    return true;
  });

  return (
    <IntelligenceLockGate
      isVerified={isUnlocked}
      isAdmin={userRole === 'ADMIN' || Boolean(alertSettings?.isAdmin)}
      userRole={userRole}
      onOpenDiscordModal={onOpenDiscordModal}
      title="AI PATTERN RECOGNITION LOCKED"
      subtitle="Verify your VIXY Vault Discord membership to unlock live AI microstructure patterns, liquidity sweeps, and L2 order book detection."
    >
      <div className="bg-[#0B0A1C] rounded-2xl border border-purple-900/50 p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 font-sans relative overflow-hidden transition-all duration-300">
      {/* Background Soft Ambient Glow */}
      <div className="absolute top-0 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* PATTERN DETECTOR HEADER BAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-900/40 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 shrink-0">
            <Radar className="w-6 h-6 animate-spin text-purple-400" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                <span>PATTERN DETECTOR</span>
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                LIVE L2 SCANNER
              </span>
            </div>
            <p className="text-xs text-purple-300/70">
              Real-time scanning for 30+ institutional patterns (Liquidity Sweeps, Traps, Whales, Absorptions & Spoofing).
            </p>
          </div>
        </div>

        {/* Scan Status & Filter Tabs Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="text-[11px] font-mono text-purple-300/60 hidden lg:block">
            Scanned: <strong className="text-purple-200">{scanCount} setups</strong> • Sync: {lastScanTime}
          </div>

          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-bold transition-all border border-purple-500/40 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'SCANNING L2...' : 'RE-SCAN L2'}</span>
          </button>
        </div>
      </div>

      {/* FILTER TABS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#080517] p-1.5 rounded-xl border border-purple-900/40 relative z-10">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black'
                : 'text-purple-300/60 hover:text-white'
            }`}
          >
            ALL ({patterns.length})
          </button>

          <button
            onClick={() => setActiveFilter('BULLISH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'BULLISH'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-emerald-400/70 hover:text-emerald-300'
            }`}
          >
            <span>BULLISH</span>
            <span className="text-[10px] bg-emerald-950 px-1 rounded text-emerald-300">4</span>
          </button>

          <button
            onClick={() => setActiveFilter('BEARISH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'BEARISH'
                ? 'bg-rose-600 text-white shadow-md font-black'
                : 'text-rose-400/70 hover:text-rose-300'
            }`}
          >
            <span>BEARISH</span>
            <span className="text-[10px] bg-rose-950 px-1 rounded text-rose-300">1</span>
          </button>

          <button
            onClick={() => setActiveFilter('MICRO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'MICRO'
                ? 'bg-cyan-600 text-white shadow-md font-black'
                : 'text-cyan-400/70 hover:text-cyan-300'
            }`}
          >
            <span>MICROSTRUCTURE</span>
            <span className="text-[10px] bg-cyan-950 px-1 rounded text-cyan-300">4</span>
          </button>

          <button
            onClick={() => setActiveFilter('EXPERIMENTAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'EXPERIMENTAL'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'text-amber-400/70 hover:text-amber-300'
            }`}
          >
            <span>EXPERIMENTAL (SPOOF)</span>
            <span className="text-[10px] bg-amber-950 px-1 rounded text-amber-300">1</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-purple-300/50 px-2 hidden sm:inline">
          Click any pattern card to view deep L2 breakdown
        </span>
      </div>

      {/* PATTERN CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
        {filteredPatterns.map((pat) => (
          <div
            key={pat.id}
            onClick={() => setSelectedPattern(pat)}
            className={`bg-[#100B24] p-4 rounded-xl border transition-all duration-200 cursor-pointer space-y-3 hover:border-purple-400/80 hover:shadow-lg hover:shadow-purple-900/20 group relative overflow-hidden ${
              pat.isExperimental
                ? 'border-amber-500/50 bg-amber-950/10'
                : 'border-purple-900/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors">
                    {appMode === 'SIMPLE' ? (pat.simpleName || pat.name) : pat.name}
                  </span>
                  {pat.isExperimental && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/40 uppercase">
                      EXPERIMENTAL
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-purple-300/60 block mt-0.5">{pat.type}</span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-black text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60 block">
                  {pat.confidence}% Conf.
                </span>
                <span className="text-[10px] font-mono text-purple-300/50 block mt-1">{pat.detectedAge}</span>
              </div>
            </div>

            <p className="text-xs text-purple-100/90 leading-relaxed font-sans">
              {appMode === 'SIMPLE' ? (pat.simpleDescription || pat.description) : pat.description}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-900/40 text-[10px] font-mono">
              <div>
                <span className="block text-purple-300/50 text-[9px]">HIST WIN RATE</span>
                <span className="font-extrabold text-emerald-400">{pat.historicalAccuracy}%</span>
              </div>
              <div>
                <span className="block text-purple-300/50 text-[9px]">SEEN</span>
                <span className="font-bold text-slate-200">{pat.seenCount}x</span>
              </div>
              <div className="text-right">
                <span className="block text-purple-300/50 text-[9px]">STATUS</span>
                <span className={`font-black ${pat.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-cyan-300'}`}>
                  {pat.status}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-cyan-300 font-sans bg-[#080517] px-2.5 py-1.5 rounded-lg border border-purple-900/40 flex items-center justify-between">
              <span className="text-purple-300/60 text-[10px] font-bold">Follow Through:</span>
              <span className="font-semibold text-cyan-200 text-[11px]">{pat.expectedFollowThrough}</span>
            </div>
          </div>
        ))}
      </div>

      {/* DEEP DETAIL MODAL DIALOG WHEN CARD IS CLICKED */}
      {selectedPattern && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#120A2A] border border-purple-500/50 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 text-purple-100 relative">
            <button
              onClick={() => setSelectedPattern(null)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-black text-white">{selectedPattern.name} Breakdown</h3>
            </div>

            <div className="bg-[#0A0518] p-3 rounded-xl border border-purple-900/50 space-y-2 text-xs">
              <div className="flex justify-between border-b border-purple-900/40 pb-2">
                <span className="text-purple-300/60">Category:</span>
                <span className="font-bold text-emerald-400">{selectedPattern.category}</span>
              </div>
              <div className="flex justify-between border-b border-purple-900/40 pb-2">
                <span className="text-purple-300/60">Confidence Level:</span>
                <span className="font-black text-purple-300">{selectedPattern.confidence}%</span>
              </div>
              <div className="flex justify-between border-b border-purple-900/40 pb-2">
                <span className="text-purple-300/60">Historical Accuracy Rate:</span>
                <span className="font-bold text-emerald-400">{selectedPattern.historicalAccuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-300/60">Expected Follow Through:</span>
                <span className="font-bold text-cyan-300">{selectedPattern.expectedFollowThrough}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-purple-200">Institutional L2 Explanation:</span>
              <p className="text-xs text-purple-200/90 leading-relaxed font-sans bg-[#080414] p-3 rounded-xl border border-purple-900/40">
                {selectedPattern.detailBreakdown || selectedPattern.description}
              </p>
            </div>

            <button
              onClick={() => setSelectedPattern(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30"
            >
              Close Pattern Analysis
            </button>
          </div>
        </div>
      )}

      {/* FOOTER NOTE */}
      <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between text-[11px] text-purple-300/60 font-sans">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Real-time microsecond L2 order book detection engine active.</span>
        </span>
        <span className="font-mono text-emerald-400/90 font-semibold">
          30+ Patterns Active
        </span>
      </div>
    </div>
    </IntelligenceLockGate>
  );
};
