import React from 'react';
import { Layers } from 'lucide-react';
import { safeToFixed } from '../../utils/numeric';

interface OrderFlowPressureProps {
  rawApiData?: any;
  venue?: string;
  timeframe?: string;
}

export const OrderFlowPressure: React.FC<OrderFlowPressureProps> = ({
  rawApiData,
  venue = 'Kalshi',
  timeframe = '15M',
}) => {
  const displayVenue = venue || 'Kalshi';
  const displayOrderFlow = rawApiData?.features?.orderBookImbalance ?? 0;
  const takerBuyersPct = Math.max(0, Math.min(100, Math.round((displayOrderFlow + 1) * 50)));
  const takerSellersPct = 100 - takerBuyersPct;

  return (
    <div className="bg-[#080312] border border-purple-900/40 rounded-2xl p-6 relative overflow-hidden shadow-2xl font-mono">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-black tracking-[0.2em] text-slate-200 uppercase">
            VIXY ORDER FLOW PRESSURE
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.2em] text-purple-400/60 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE • {displayVenue} {timeframe}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="col-span-1 md:col-span-8 flex flex-col space-y-5">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-1">
                TAKER BUYERS
              </div>
              <div className="text-3xl font-black text-[#00FF9D]">{takerBuyersPct}%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-1">
                TAKER SELLERS
              </div>
              <div className="text-3xl font-black text-[#FF3366]">{takerSellersPct}%</div>
            </div>
          </div>

          <div className="h-3 w-full bg-[#1a050a] rounded-full overflow-hidden flex relative shadow-inner">
            <div
              className="h-full bg-[#00FF9D] shadow-[0_0_10px_rgba(0,255,157,0.5)] transition-all duration-1000"
              style={{ width: `${takerBuyersPct}%` }}
            />
            <div
              className="h-full bg-[#FF3366] transition-all duration-1000"
              style={{ width: `${takerSellersPct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">
                NET FLOW (DELTA)
              </div>
              <div className={`text-lg font-black ${displayOrderFlow >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                {displayOrderFlow >= 0 ? '+' : ''}{safeToFixed(Math.abs(displayOrderFlow), 3)}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">
                DELTA (EST. USD)
              </div>
              <div className={`text-lg font-black ${displayOrderFlow >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                {displayOrderFlow >= 0 ? '+' : '-'}${safeToFixed(Math.abs(displayOrderFlow * 6.2), 2)}M
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">
                PRESSURE
              </div>
              <div className="text-lg font-black text-[#00FF9D]">
                RISING
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">
                FLOW STATE
              </div>
              <div className={`text-lg font-black ${displayOrderFlow >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                {displayOrderFlow >= 0 ? 'BULLISH' : 'BEARISH'}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-4 flex flex-col justify-center space-y-6 border-l border-purple-900/30 pl-8">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
              <span className="text-purple-400/70">BUY VOLUME</span>
              <span className="text-[#00FF9D]">{takerBuyersPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#06020c] rounded-full overflow-hidden">
              <div className="h-full bg-[#00FF9D]" style={{ width: `${takerBuyersPct}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
              <span className="text-purple-400/70">SELL VOLUME</span>
              <span className="text-[#FF3366]">{takerSellersPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#06020c] rounded-full overflow-hidden">
              <div className="h-full bg-[#FF3366]" style={{ width: `${takerSellersPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
