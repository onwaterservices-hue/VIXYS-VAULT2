import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { fetchResolvedLogApi } from '../services/api';

/**
 * Public track record, read live from the same ledger VIXY Locks renders.
 *
 * This replaced a fabricated trust line (an invented trader count borrowing a
 * competitor's name, and an invented accuracy over an invented number of
 * settlements). Nothing here is rounded up or padded. If the ledger cannot be
 * read, it says where the record lives instead of showing any number.
 */
export const LiveTrackRecord: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [record, setRecord] = useState<{ wins: number; losses: number; total: number; pct: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchResolvedLogApi()
      .then((d: any) => {
        if (!alive) return;
        const btc = d?.stats?.perAsset?.BTC;
        const src =
          btc && Number(btc.total) > 0
            ? { wins: btc.wins, losses: btc.losses, total: btc.total, pct: btc.winRatePct }
            : d?.stats && Number(d.stats.total) > 0
            ? { wins: d.stats.winCount, losses: d.stats.lossCount, total: d.stats.total, pct: d.stats.winRatePct }
            : null;
        const ok = src && [src.wins, src.losses, src.total, src.pct].every((v) => v !== null && v !== undefined && Number.isFinite(Number(v)));
        if (ok) {
          setRecord({ wins: Number(src!.wins), losses: Number(src!.losses), total: Number(src!.total), pct: Number(src!.pct) });
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={`text-[11px] text-purple-300/60 font-sans space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-amber-300 font-bold">
        <Star className="w-3.5 h-3.5 fill-amber-300" />
        <span>Public track record</span>
      </div>
      {record ? (
        <p>
          BTC 15-minute locks: <strong className="text-white font-mono">{record.wins}–{record.losses}</strong> ({record.pct}%) across{' '}
          {record.total} locks graded against the settlement price. Every lock is listed in VIXY Locks.
        </p>
      ) : (
        <p>{failed ? 'Every lock and its graded outcome is published in VIXY Locks.' : 'Loading the live record…'}</p>
      )}
    </div>
  );
};

export default LiveTrackRecord;
