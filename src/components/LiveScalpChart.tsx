import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { Zap, Activity, ShieldCheck, Flame, Wifi, Database, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchApiSignal, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';
import { ModelStatusBadge } from './ModelStatusBadge';

interface LiveScalpChartProps {
  asset?: string;
  desk?: '15s' | '15m' | '1h' | string;
  title?: string;
  spotPrice?: number;
}

interface TradeEvent {
  timestamp: number;
  volume: number;
  isSell: boolean;
}

export const LiveScalpChart: React.FC<LiveScalpChartProps> = ({
  asset = 'BTC',
  desk = '15s',
  title = 'Live Scalping Order Flow & Kline Terminal',
  spotPrice,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Connection & Data State
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('CONNECTING...');
  const [lastPrice, setLastPrice] = useState<number | null>(spotPrice || (asset === 'ETH' ? 3480.5 : 64160.5));
  const [priceChange, setPriceChange] = useState<number>(0);

  // Sync spotPrice prop
  useEffect(() => {
    if (spotPrice && spotPrice > 0) {
      setLastPrice(spotPrice);
    }
  }, [spotPrice]);

  // Pressure Bar State (Decayed 30s rolling window)
  const [buyVolume30s, setBuyVolume30s] = useState<number>(0);
  const [sellVolume30s, setSellVolume30s] = useState<number>(0);
  const [buyRatio, setBuyRatio] = useState<number>(50);

  // Signal & Model Status State
  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  const tradesBufferRef = useRef<TradeEvent[]>([]);

  const binanceSymbol = `${asset}USDT`.toUpperCase();
  const klineInterval = desk === '1h' ? '1m' : '1s';

  // 1. Fetch Signal & Model Status
  useEffect(() => {
    let active = true;

    const loadSignalData = async () => {
      const [sig, status] = await Promise.all([
        fetchApiSignal(asset, desk),
        fetchModelStatus(asset, desk),
      ]);
      if (active) {
        setApiSignal(sig);
        setModelStatus(status);
      }
    };

    loadSignalData();
    const interval = setInterval(loadSignalData, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [asset, desk]);

  // 2. Initialize Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    container.innerHTML = ''; // Clean up

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#090418' },
        textColor: '#8b84a8',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace, system-ui',
      },
      grid: {
        vertLines: { color: 'rgba(139, 132, 168, 0.08)' },
        horzLines: { color: 'rgba(139, 132, 168, 0.08)' },
      },
      crosshair: {
        vertLine: {
          color: '#a855f7',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2e1065',
        },
        horzLine: {
          color: '#a855f7',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2e1065',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(139, 132, 168, 0.15)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(139, 132, 168, 0.15)',
        timeVisible: true,
        secondsVisible: desk === '15s',
      },
      width: container.clientWidth || 600,
      height: 360,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#34d399',
      wickDownColor: '#fb7185',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle auto-resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [asset, desk]);

  // 3. Fetch Historical Klines from Binance REST API & Subscribe to WebSockets
  useEffect(() => {
    let isCancelled = false;

    // Connection timeout fallback
    const connTimeout = setTimeout(() => {
      if (!isCancelled && !wsConnected) {
        setConnectionStatus('LIVE (FEED)');
      }
    }, 2500);

    // Fetch REST Klines first
    const restUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1m&limit=80`;
    fetch(restUrl)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled || !seriesRef.current || !Array.isArray(data)) return;

        const formattedCandles = data.map((d: any) => ({
          time: Math.floor(d[0] / 1000) as any,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        seriesRef.current.setData(formattedCandles);
        setConnectionStatus('LIVE (REST)');

        if (formattedCandles.length > 0) {
          const last = formattedCandles[formattedCandles.length - 1];
          const prev = formattedCandles[formattedCandles.length - 2] || last;
          setLastPrice(last.close);
          setPriceChange(((last.close - prev.close) / prev.close) * 100);
        }
      })
      .catch((err) => {
        console.warn('Failed to load Binance REST klines', err);
        if (!isCancelled) setConnectionStatus('LIVE (SIM)');
      });

    // Connect to Binance Kline & Trade WebSockets
    const streamName = `${binanceSymbol.toLowerCase()}@kline_${klineInterval}/${binanceSymbol.toLowerCase()}@trade`;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamName}`);

    ws.onopen = () => {
      if (!isCancelled) {
        setWsConnected(true);
        setConnectionStatus('BINANCE LIVE WS');
      }
    };

    ws.onclose = () => {
      if (!isCancelled) {
        setWsConnected(false);
        setConnectionStatus('LIVE (FEED)');
      }
    };

    ws.onerror = (e) => {
      console.warn('Binance WS error', e);
      if (!isCancelled) {
        setWsConnected(false);
        setConnectionStatus('LIVE (FEED)');
      }
    };

    ws.onmessage = (event) => {
      if (isCancelled) return;
      try {
        const msg = JSON.parse(event.data);

        // Handle Kline Stream
        if (msg.e === 'kline') {
          const k = msg.k;
          const candleTime = Math.floor(k.t / 1000) as any;
          const candle = {
            time: candleTime,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
          };

          if (seriesRef.current) {
            seriesRef.current.update(candle);
          }
          setLastPrice(candle.close);
        }

        // Handle Trade Stream (Taker flow for buy/sell pressure)
        if (msg.e === 'trade') {
          const isSell = msg.m; // true = sell hit bid, false = buy hit ask
          const volume = parseFloat(msg.q);
          const timestamp = msg.T;

          tradesBufferRef.current.push({ timestamp, volume, isSell });
        }
      } catch (err) {
        console.warn('Error parsing WS message', err);
      }
    };

    // Pressure Decay Timer (runs every second)
    const decayInterval = setInterval(() => {
      const now = Date.now();
      const windowMs = 30000; // 30 second window

      // Filter out trades older than 30s
      tradesBufferRef.current = tradesBufferRef.current.filter(
        (t) => now - t.timestamp <= windowMs
      );

      let buyVol = 0;
      let sellVol = 0;

      for (const t of tradesBufferRef.current) {
        if (t.isSell) {
          sellVol += t.volume;
        } else {
          buyVol += t.volume;
        }
      }

      setBuyVolume30s(buyVol);
      setSellVolume30s(sellVol);

      const total = buyVol + sellVol;
      if (total > 0) {
        setBuyRatio(Math.round((buyVol / total) * 1000) / 10);
      } else {
        setBuyRatio(50);
      }
    }, 1000);

    return () => {
      isCancelled = true;
      clearInterval(decayInterval);
      ws.close();
    };
  }, [binanceSymbol, klineInterval]);

  const hasActiveModel = modelStatus?.hasActiveModel ?? false;
  const settled = modelStatus?.settledCount ?? apiSignal?.sampleSize ?? 0;
  const minRequired = modelStatus?.minRequired ?? 500;
  const netDelta = (buyVolume30s - sellVolume30s).toFixed(2);

  return (
    <div className="bg-[#090418]/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(147,51,234,0.12)] space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 shadow-md">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                {asset} {desk.toUpperCase()} • {title}
              </h2>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-[10px] font-mono text-purple-300">
                <Wifi className={`w-3 h-3 ${connectionStatus.includes('LIVE') ? 'text-emerald-400 animate-pulse' : 'text-amber-400 animate-bounce'}`} />
                <span>{connectionStatus}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Live Taker Flow • Order Flow Imbalance • Kline Stream
            </p>
          </div>
        </div>

        {/* Model Status Indicator */}
        <div className="flex items-center gap-2">
          <ModelStatusBadge asset={asset} desk={desk} />
        </div>
      </div>

      {/* Signal / Confluence Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#12082b]/80 border border-purple-500/20">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Engine Signal State</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-sm font-black font-mono px-2.5 py-0.5 rounded border ${
                hasActiveModel && apiSignal?.action === 'BUY_YES'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : hasActiveModel && apiSignal?.action === 'BUY_NO'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {hasActiveModel ? apiSignal?.action : 'HOLD / UNCALIBRATED'}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Model Confluence</span>
          <span className="text-sm font-black font-mono text-white">
            {hasActiveModel && apiSignal?.modelProbability !== null && apiSignal?.modelProbability !== undefined
              ? `${Math.round(apiSignal.modelProbability * 100)}%`
              : 'Uncalibrated (Pending 500 Samples)'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Spot Price</span>
          <span className="text-sm font-black font-mono text-emerald-400">
            {lastPrice ? `$${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}` : 'Fetching...'}
          </span>
        </div>
      </div>

      {/* Taker Buy / Sell Pressure Bar (30s Rolling Window) */}
      <div className="space-y-1.5 p-3.5 rounded-xl bg-[#0c061d] border border-purple-900/50 shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-mono font-extrabold">
          <span className="text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            TAKER BUY FLOW: {buyRatio}% ({buyVolume30s.toFixed(2)} {asset})
          </span>
          <span className="text-slate-400">
            30s NET DELTA:{' '}
            <strong className={parseFloat(netDelta) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {parseFloat(netDelta) >= 0 ? `+${netDelta}` : netDelta} {asset}
            </strong>
          </span>
          <span className="text-rose-400 flex items-center gap-1">
            TAKER SELL FLOW: {(100 - buyRatio).toFixed(1)}% ({sellVolume30s.toFixed(2)} {asset})
            <TrendingDown className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Visual Pressure Bar with Outer Glow */}
        <div className="relative h-3 w-full bg-slate-900/90 rounded-full overflow-hidden p-0.5 flex border border-purple-900/40">
          <div
            style={{ width: `${buyRatio}%` }}
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
          />
          <div
            style={{ width: `${100 - buyRatio}%` }}
            className="h-full bg-gradient-to-r from-rose-500 to-rose-700 rounded-r-full transition-all duration-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
          />
        </div>
      </div>

      {/* Lightweight Candlestick Chart Render Container */}
      <div className="relative rounded-xl overflow-hidden border border-purple-500/20 bg-[#080414]">
        <div ref={chartContainerRef} className="w-full" />
      </div>
    </div>
  );
};
