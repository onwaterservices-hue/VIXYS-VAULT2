import { useEffect, useState } from 'react';

/**
 * Live per-asset market tape for surfaces that compare assets.
 *
 * Both sources are real Coinbase Exchange data proxied by the server:
 *   /api/orderflow  resting L2 book, top 30 levels each side
 *   /api/whales     prints of $10k or more in the last 100 trades
 *
 * The orderflow route names some of its fields "taker", but they are computed
 * from RESTING book depth. Consumers must present them as book depth, never as
 * aggressor flow. A failed or unsupported product is reported as UNAVAILABLE,
 * and an empty whale window is reported as an empty window. Nothing is padded.
 */

export type TapeStatus = 'LOADING' | 'LIVE' | 'UNAVAILABLE';

export interface BookDepth {
  status: TapeStatus;
  bidUSD: number | null;
  askUSD: number | null;
  bidSharePct: number | null;
}

export interface LargePrint {
  id: string;
  sizeUSD: number;
  takerSide: 'BUY' | 'SELL';
  time: string;
}

export interface LargePrints {
  status: TapeStatus;
  thresholdUSD: number | null;
  tradesScanned: number | null;
  prints: LargePrint[];
}

const POLL_MS = 15000;

const EMPTY_BOOK = (status: TapeStatus): BookDepth => ({ status, bidUSD: null, askUSD: null, bidSharePct: null });
const EMPTY_PRINTS = (status: TapeStatus): LargePrints => ({ status, thresholdUSD: null, tradesScanned: null, prints: [] });

export function useAssetMarketTape(symbol: string): { book: BookDepth; prints: LargePrints } {
  const [book, setBook] = useState<BookDepth>(EMPTY_BOOK('LOADING'));
  const [prints, setPrints] = useState<LargePrints>(EMPTY_PRINTS('LOADING'));

  useEffect(() => {
    let alive = true;
    const sym = encodeURIComponent(symbol);
    setBook(EMPTY_BOOK('LOADING'));
    setPrints(EMPTY_PRINTS('LOADING'));

    const load = async () => {
      const [bookRes, whaleRes] = await Promise.all([
        fetch(`/api/orderflow?asset=${sym}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/whales?asset=${sym}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (!alive) return;

      const bid = Number(bookRes?.bidVolumeUSD);
      const ask = Number(bookRes?.askVolumeUSD);
      if (Number.isFinite(bid) && Number.isFinite(ask) && bid + ask > 0) {
        setBook({ status: 'LIVE', bidUSD: bid, askUSD: ask, bidSharePct: Math.round((bid / (bid + ask)) * 100) });
      } else {
        setBook(EMPTY_BOOK('UNAVAILABLE'));
      }

      if (whaleRes && Array.isArray(whaleRes.orders)) {
        const threshold = Number(whaleRes.thresholdUSD);
        const scanned = Number(whaleRes.tradesScanned);
        setPrints({
          status: 'LIVE',
          thresholdUSD: Number.isFinite(threshold) ? threshold : null,
          tradesScanned: Number.isFinite(scanned) ? scanned : null,
          prints: whaleRes.orders
            // A print without a known aggressor is dropped, never guessed.
            .filter((o: any) => o && (o.takerSide === 'BUY' || o.takerSide === 'SELL') && Number(o.sizeUSD) > 0)
            .slice(0, 3)
            .map((o: any) => ({
              id: String(o.id),
              sizeUSD: Number(o.sizeUSD),
              takerSide: o.takerSide,
              time: String(o.time || ''),
            })),
        });
      } else {
        setPrints(EMPTY_PRINTS('UNAVAILABLE'));
      }
    };

    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [symbol]);

  return { book, prints };
}

export const formatUsdCompact = (v: number | null): string => {
  if (v === null || !Number.isFinite(v)) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  return `$${Math.round(v)}`;
};
