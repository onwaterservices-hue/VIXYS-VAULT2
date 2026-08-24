import React, { useState } from 'react';
import {
  V2Panel,
  V2Button,
  V2Badge,
  V2MetricCard,
  V2Tabs,
  V2StatusIndicator,
  V2Input,
  V2Tooltip,
  V2ChartContainer,
  V2LoadingState,
  V2ErrorState,
  V2EmptyState,
  V2LockedState,
} from '../ui/vixyV2Primitives';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Lock,
  Search,
  Filter,
  Check,
  RefreshCw,
  AlertOctagon,
  BarChart2,
  Terminal,
} from 'lucide-react';

export const DesignSystemShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('components');
  const [inputValue, setInputValue] = useState('');
  const [chartTf, setChartTf] = useState('15m');
  const [isLoadingBtn, setIsLoadingBtn] = useState(false);

  return (
    <div className="min-h-screen bg-[#07050d] text-slate-200 p-4 sm:p-6 lg:p-8 space-y-8 font-mono max-w-7xl mx-auto select-none">
      {/* Header Banner */}
      <div className="border border-purple-800/40 bg-[#0c0818]/90 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-extrabold font-sans text-white tracking-tight">
              VIXY VAULT 2.0 — DESIGN SYSTEM
            </h1>
            <V2Badge variant="pro" size="xs">
              FOUNDATION V2
            </V2Badge>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Institutional, restrained, quantitative trading component library & visual language.
          </p>
        </div>

        <V2Tabs
          tabs={[
            { id: 'components', label: 'COMPONENTS', icon: Layers },
            { id: 'tokens', label: 'TOKENS & COLOR', icon: Sparkles },
            { id: 'states', label: 'SYSTEM STATES', icon: Activity },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />
      </div>

      {activeTab === 'components' && (
        <div className="space-y-8 animate-fadeIn">
          {/* SECTION 1: BUTTONS & BADGES */}
          <V2Panel title="1. BUTTONS & BADGES WORKSTATION" icon={Zap}>
            <div className="space-y-6">
              {/* Button Variants */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                  BUTTON VARIANTS
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <V2Button variant="primary">PRIMARY VIXY</V2Button>
                  <V2Button variant="secondary">SECONDARY</V2Button>
                  <V2Button variant="outline">OUTLINE</V2Button>
                  <V2Button variant="ghost">GHOST</V2Button>
                  <V2Button variant="success" icon={TrendingUp}>
                    BUY LONG
                  </V2Button>
                  <V2Button variant="danger" icon={AlertOctagon}>
                    SELL SHORT
                  </V2Button>
                  <V2Button variant="amber" icon={Lock}>
                    AMBER LOCK
                  </V2Button>
                </div>
              </div>

              {/* Sizes & Loading State */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                  BUTTON SIZES & INTERACTIVE STATES
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <V2Button size="xs" variant="primary">
                    XS BUTTON
                  </V2Button>
                  <V2Button size="sm" variant="primary">
                    SM BUTTON
                  </V2Button>
                  <V2Button size="md" variant="primary">
                    MD BUTTON
                  </V2Button>
                  <V2Button size="lg" variant="primary">
                    LG BUTTON
                  </V2Button>
                  <V2Button
                    size="md"
                    variant="outline"
                    isLoading={isLoadingBtn}
                    onClick={() => {
                      setIsLoadingBtn(true);
                      setTimeout(() => setIsLoadingBtn(false), 2000);
                    }}
                  >
                    {isLoadingBtn ? 'SYNCING...' : 'TRIGGER LOADING'}
                  </V2Button>
                </div>
              </div>

              {/* Badges */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                  QUANTITATIVE BADGES
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <V2Badge variant="emerald" dot>
                    BULLISH ↑
                  </V2Badge>
                  <V2Badge variant="rose" dot>
                    BEARISH ↓
                  </V2Badge>
                  <V2Badge variant="amber" dot>
                    LOCKED 88%
                  </V2Badge>
                  <V2Badge variant="cyan" dot>
                    15M CONTRACT
                  </V2Badge>
                  <V2Badge variant="purple">VIXY ENGINE</V2Badge>
                  <V2Badge variant="pro">FLAGSHIP ELITE</V2Badge>
                  <V2Badge variant="neutral">NEUTRAL</V2Badge>
                  <V2Badge variant="outline">OUTLINE BADGE</V2Badge>
                </div>
              </div>
            </div>
          </V2Panel>

          {/* SECTION 2: METRICS & STATUS INDICATORS */}
          <V2Panel title="2. QUANT METRIC CARDS & ENGINE STATUS" icon={BarChart2}>
            <div className="space-y-6">
              {/* Metric Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <V2MetricCard
                  label="BTC SPOT PRICE"
                  value="$64,591.20"
                  change="2.45%"
                  isPositive={true}
                  subtext="Vol: 18,450 BTC • 24h High: $65,020"
                  icon={TrendingUp}
                  variant="emerald"
                />
                <V2MetricCard
                  label="BAYESIAN CONVICTION"
                  value="78.4%"
                  change="3.2%"
                  isPositive={true}
                  subtext="6/6 Signals Aligned • High Conviction"
                  icon={ShieldCheck}
                  variant="accent"
                />
                <V2MetricCard
                  label="REVERSAL RISK INDEX"
                  value="18%"
                  change="-4.1%"
                  isPositive={true}
                  subtext="Optimal Protection • Stop: -8%"
                  icon={Activity}
                  variant="default"
                />
                <V2MetricCard
                  label="15M LOCK QUALITY"
                  value="88/100"
                  change="LOCKED"
                  isPositive={true}
                  subtext="Epoch C-67892 • Settlement in 06:42"
                  icon={Lock}
                  variant="amber"
                />
              </div>

              {/* Status Indicators */}
              <div className="space-y-2 pt-2 border-t border-purple-900/30">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                  CYCLE STATE MACHINE INDICATORS
                </span>
                <div className="flex flex-wrap items-center gap-6 bg-[#080512] p-4 rounded-xl border border-purple-900/40">
                  <V2StatusIndicator status="live" label="LIVE TELEMETRY" />
                  <V2StatusIndicator status="building" label="BUILDING CYCLE" />
                  <V2StatusIndicator status="confirming" label="CONFIRMING BIAS" />
                  <V2StatusIndicator status="locked" label="LOCKED EPOCH" />
                  <V2StatusIndicator status="settled" label="SETTLED WIN" />
                  <V2StatusIndicator status="degraded" label="DEGRADED SYNC" />
                  <V2StatusIndicator status="offline" label="OFFLINE" />
                </div>
              </div>
            </div>
          </V2Panel>

          {/* SECTION 3: INPUTS, SEARCH & TOOLTIPS */}
          <V2Panel title="3. FORM INPUTS & TOOLTIPS" icon={Search}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                  SEARCH & KEYBOARD SHORTCUT INPUT
                </span>
                <V2Input
                  placeholder="Search assets, symbols, signals, or contracts..."
                  shortcut="⌘K"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                  CONTEXTUAL HOVER TOOLTIPS
                </span>
                <div className="flex items-center gap-4 pt-1">
                  <V2Tooltip content="Bayesian multi-factor conviction algorithm score">
                    <span className="cursor-help underline underline-offset-4 decoration-purple-500 text-xs font-bold text-purple-300">
                      Hover for Conviction Info
                    </span>
                  </V2Tooltip>

                  <V2Tooltip content="Orders flow imbalance between taker buys vs sells">
                    <span className="cursor-help underline underline-offset-4 decoration-cyan-500 text-xs font-bold text-cyan-300">
                      Hover for Order Flow Info
                    </span>
                  </V2Tooltip>
                </div>
              </div>
            </div>
          </V2Panel>

          {/* SECTION 4: CHART CONTAINER */}
          <V2ChartContainer
            title="WORKSTATION CHART CONTAINER — BTC/USDT 15M"
            timeframe={chartTf}
            onTimeframeChange={setChartTf}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-[#06030d]">
              <div className="text-xs text-purple-400 font-mono font-bold">
                [LIGHTWEIGHT CHART WORKSTATION CANVAS]
              </div>
              <div className="text-[11px] text-slate-500 max-w-md font-sans">
                Real-time candlestick rendering engine with VIXY Neural Ribbon overlays, volume bars, and prediction cycle lock windows.
              </div>
              <div className="flex items-center gap-2 pt-2">
                <V2Badge variant="emerald">O: $64,472.31</V2Badge>
                <V2Badge variant="emerald">H: $64,612.08</V2Badge>
                <V2Badge variant="rose">L: $64,463.20</V2Badge>
                <V2Badge variant="cyan">C: $64,591.20 (+0.18%)</V2Badge>
              </div>
            </div>
          </V2ChartContainer>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className="space-y-6 animate-fadeIn">
          <V2Panel title="COLOR PALETTE & BRAND FOUNDATION">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#07050d] border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-white">NEAR-BLACK CANVAS</div>
                <div className="text-[10px] text-slate-500">#07050d</div>
                <p className="text-[11px] text-slate-400 font-sans">Dark graphite background replacing heavy saturated glows.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#0c0818] border border-purple-900/40 space-y-1">
                <div className="text-xs font-bold text-purple-300">PANEL BASE / WORKSTATION</div>
                <div className="text-[10px] text-slate-500">#0c0818</div>
                <p className="text-[11px] text-slate-400 font-sans">Institutional surface fill with subtle purple border.</p>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/80 border border-purple-600 text-purple-200 space-y-1">
                <div className="text-xs font-bold">VIXY PURPLE (PRIMARY)</div>
                <div className="text-[10px] text-purple-400">#9333ea</div>
                <p className="text-[11px] text-purple-300 font-sans">VIXY intelligence, active navigation, key focus state.</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 space-y-1">
                <div className="text-xs font-bold">CONTROLLED EMERALD (POSITIVE)</div>
                <div className="text-[10px] text-emerald-400">#10b981</div>
                <p className="text-[11px] text-emerald-300 font-sans">Restrained bullish signals, profit targets, healthy status.</p>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 space-y-1">
                <div className="text-xs font-bold">CONTROLLED ROSE (NEGATIVE)</div>
                <div className="text-[10px] text-rose-400">#f43f5e</div>
                <p className="text-[11px] text-rose-300 font-sans">Restrained bearish signals, risk alerts, drawdown warning.</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-600 text-amber-200 space-y-1">
                <div className="text-xs font-bold">AMBER LOCK & QUALITY</div>
                <div className="text-[10px] text-amber-400">#f59e0b</div>
                <p className="text-[11px] text-amber-300 font-sans">Cycle locks, conviction quality, high alert status.</p>
              </div>
            </div>
          </V2Panel>
        </div>
      )}

      {activeTab === 'states' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Loading State */}
          <V2Panel title="LOADING SKELETON & TELEMETRY SYNC">
            <V2LoadingState label="FETCHING CANONICAL 15M DECISION..." />
          </V2Panel>

          {/* Error State */}
          <V2Panel title="ERROR HANDLER">
            <V2ErrorState
              message="WEBSOCKET CONNECTION TIMEOUT — RETRYING BACKEND FEED"
              onRetry={() => alert('Retrying connection...')}
            />
          </V2Panel>

          {/* Empty State */}
          <V2Panel title="EMPTY DATA STATE">
            <V2EmptyState
              title="NO ACTIVE TRADES IN CURRENT CYCLE"
              description="VIXY decision core is currently in building state. Next lock window opens in 04:12."
              action={<V2Button size="xs" variant="outline">VIEW HISTORICAL LOCKS</V2Button>}
            />
          </V2Panel>

          {/* Locked State */}
          <V2Panel title="ENTITLEMENT LOCKED PREVIEW">
            <V2LockedState
              featureName="SCALPING DESK (15-SECOND INTELLIGENCE)"
              requiredTier="PRO OR ELITE"
              onUnlock={() => alert('Opening Upgrade Modal...')}
            />
          </V2Panel>
        </div>
      )}
    </div>
  );
};
