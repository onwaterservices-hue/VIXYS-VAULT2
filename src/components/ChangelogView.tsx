import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Database, Server, Radio, ArrowRight, Info, BarChart3, Cpu } from 'lucide-react';

/**
 * System Status & Changelog.
 *
 * Health is read from the live engine payload (/api/vixy/15m/current): the
 * engine's own tick timestamp, its per-venue freshness flags, the Kalshi read
 * age and whether the strike is resolved. The calibration sample comes from
 * /api/model-status. When an endpoint does not answer, the page says so.
 *
 * The release timeline lists merged pull requests with their real merge dates
 * and numbers. Nothing here is a version number, latency or date that did not
 * happen.
 */

interface ChangelogViewProps {
  onOpenTerminal?: () => void;
  onOpenPricing?: () => void;
}

type HealthStatus = 'LIVE' | 'STALE' | 'PENDING' | 'DOWN' | 'UNKNOWN';

interface ServiceRow {
  name: string;
  source: string;
  status: HealthStatus;
  detail: string;
  icon: React.ElementType;
}

type Category = 'ENGINE' | 'HONESTY' | 'SECURITY' | 'MEMBERSHIP' | 'DISCORD';

interface ReleaseChange {
  pr: number;
  category: Category;
  text: string;
}

interface ReleaseGroup {
  date: string;
  title: string;
  changes: ReleaseChange[];
}

// Merged pull requests, newest first. Dates are merge dates.
const RELEASES: ReleaseGroup[] = [
  {
    date: '2026-09-11',
    title: 'Every surface shows measured data',
    changes: [
      { pr: 101, category: 'HONESTY', text: 'Prediction Center ribbon chart no longer claims a live feed it does not have or seeds prices.' },
      { pr: 97, category: 'HONESTY', text: 'Explainability explains the live 15-minute engine; lock gates are no longer shown as blockers after a lock.' },
      { pr: 93, category: 'HONESTY', text: 'Patterns are named rules evaluated on live candles, the order book and large prints.' },
      { pr: 88, category: 'HONESTY', text: '15-second desk chart draws observed 1-minute candles and the live engine only.' },
      { pr: 86, category: 'HONESTY', text: 'Performance War Room reads the live ledger.' },
      { pr: 81, category: 'HONESTY', text: 'Leaderboard shows only server-compiled rows.' },
      { pr: 77, category: 'HONESTY', text: 'Sign-in, access and About pages stop inventing traction, accuracy, speed and venues.' },
      { pr: 73, category: 'HONESTY', text: 'Landing hero terminal shows the live engine.' },
      { pr: 72, category: 'HONESTY', text: 'Coach teaches from the live engine; desk order flow reads the real Coinbase book and tape.' },
      { pr: 71, category: 'HONESTY', text: 'Compare, Markets, search and Opportunity Scanner stop inventing per-asset model output.' },
    ],
  },
  {
    date: '2026-09-11',
    title: 'Engine measures instead of assuming',
    changes: [
      { pr: 100, category: 'ENGINE', text: 'Realized 15-minute volatility is measured or null.' },
      { pr: 91, category: 'ENGINE', text: 'Removed the public second prediction engine; one engine remains.' },
      { pr: 90, category: 'ENGINE', text: '"Active model" means calibrated: it requires 500 settled locks.' },
      { pr: 84, category: 'ENGINE', text: 'Calibration endpoints measure instead of defaulting.' },
      { pr: 80, category: 'ENGINE', text: 'Brier score averages only rows that carry one.' },
      { pr: 78, category: 'ENGINE', text: 'Cycle VWAP pipeline made deterministic.' },
      { pr: 74, category: 'ENGINE', text: 'Cold server instances no longer claim a finished lock or a track record.' },
      { pr: 70, category: 'ENGINE', text: '5m and 15m votes use real Coinbase 1-minute closes on young instances.' },
      { pr: 66, category: 'ENGINE', text: 'Cold instances no longer boot on placeholder price history.' },
    ],
  },
  {
    date: '2026-09-11',
    title: 'Account and platform hardening',
    changes: [
      { pr: 92, category: 'SECURITY', text: 'Heavy scheduled routes run at most once per window.' },
      { pr: 87, category: 'SECURITY', text: 'Payment diagnostics are staff-only.' },
      { pr: 85, category: 'SECURITY', text: 'Rate limits on sign-up and password-reset emails.' },
      { pr: 82, category: 'SECURITY', text: 'Limits on failed sign-in attempts.' },
      { pr: 76, category: 'SECURITY', text: 'Admin data is staff-only; journals are personal.' },
      { pr: 75, category: 'SECURITY', text: 'Account identity comes from the signed session.' },
    ],
  },
  {
    date: '2026-09-11',
    title: 'Membership and day pass',
    changes: [
      { pr: 96, category: 'MEMBERSHIP', text: 'Invite-to-Earn credits are applied reliably.' },
      { pr: 79, category: 'MEMBERSHIP', text: 'A day pass runs the full 24 hours it was sold as.' },
      { pr: 69, category: 'MEMBERSHIP', text: 'Landing plan buttons keep signed-out visitors on the page.' },
      { pr: 68, category: 'DISCORD', text: '3 free days for wearing the VIXY Vault server tag.' },
      { pr: 67, category: 'MEMBERSHIP', text: 'Upgrade prompt reaches real pass holders; real membership dates.' },
      { pr: 65, category: 'MEMBERSHIP', text: 'In-pass upgrade prompt while the day pass is still running.' },
    ],
  },
  {
    date: '2026-09-10',
    title: 'Calibrated probability and lock readiness',
    changes: [
      { pr: 64, category: 'MEMBERSHIP', text: 'Day pass priced against the Starter plan with plain arithmetic.' },
      { pr: 63, category: 'ENGINE', text: 'Holographic readouts tied to the engine lifecycle.' },
      { pr: 59, category: 'ENGINE', text: 'A missing strike is null, never the spot price.' },
      { pr: 52, category: 'ENGINE', text: 'Strike-side rule mode for the lock decision.' },
      { pr: 44, category: 'ENGINE', text: 'Removed the old client-side 15-minute engine.' },
      { pr: 43, category: 'ENGINE', text: 'One headline number on every surface: P(win), else engine score.' },
      { pr: 39, category: 'ENGINE', text: 'Lock Readiness panel with the engine gate checks.' },
      { pr: 38, category: 'ENGINE', text: 'Calibrated P(win) that builds through the cycle, with a conviction trail.' },
    ],
  },
  {
    date: '2026-09-09',
    title: 'Settlement integrity and referrals',
    changes: [
      { pr: 36, category: 'MEMBERSHIP', text: 'Referral discount shows through sign-up and billing.' },
      { pr: 33, category: 'MEMBERSHIP', text: 'Referral discount applies at checkout and the referrer earns.' },
      { pr: 30, category: 'MEMBERSHIP', text: 'A claimed referral code shows on every server instance.' },
      { pr: 28, category: 'ENGINE', text: 'Settlement fixes, ledger integrity and dev/prod isolation.' },
    ],
  },
  {
    date: '2026-08-31',
    title: 'Discord routing and persistence',
    changes: [
      { pr: 27, category: 'ENGINE', text: 'The VIXY Live 15-minute card reflects real backend state.' },
      { pr: 26, category: 'SECURITY', text: 'Backend data path runs through the server admin credentials.' },
      { pr: 25, category: 'SECURITY', text: 'Database security rules wired to the production database.' },
      { pr: 24, category: 'ENGINE', text: '6-minute lock window enforced; Discord claims fail closed.' },
      { pr: 22, category: 'DISCORD', text: 'Removed fabricated premium metrics from the VIP signal embed.' },
      { pr: 20, category: 'DISCORD', text: 'Free and Elite channels receive their own tier of data.' },
    ],
  },
  {
    date: '2026-08-30',
    title: 'Discord account linking',
    changes: [
      { pr: 15, category: 'SECURITY', text: 'Password reset by email, rate-limited and single-use.' },
      { pr: 13, category: 'DISCORD', text: 'Discord OAuth account linking and role sync.' },
      { pr: 12, category: 'DISCORD', text: 'Automated BTC signal routes to a configurable channel.' },
    ],
  },
  {
    date: '2026-08-28',
    title: 'Foundations',
    changes: [
      { pr: 7, category: 'DISCORD', text: 'One Discord signal broadcast per cycle.' },
      { pr: 6, category: 'ENGINE', text: 'Explicit LIVE, STALE and WARMING status for cross-asset feeds.' },
      { pr: 5, category: 'SECURITY', text: 'Admin access requires a real session and role.' },
      { pr: 3, category: 'MEMBERSHIP', text: 'Subscription lookup prefers the known payment customer.' },
    ],
  },
];

const CATEGORIES: Array<'ALL' | Category> = ['ALL', 'ENGINE', 'HONESTY', 'SECURITY', 'MEMBERSHIP', 'DISCORD'];

const ENGINE_STALE_MS = 30000;
const POLL_MS = 10000;

const STATUS_STYLE: Record<HealthStatus, string> = {
  LIVE: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
  STALE: 'text-amber-300 bg-amber-950/40 border-amber-500/30',
  PENDING: 'text-cyan-300 bg-cyan-950/40 border-cyan-500/30',
  DOWN: 'text-rose-300 bg-rose-950/40 border-rose-500/30',
  UNKNOWN: 'text-slate-400 bg-slate-900/60 border-slate-700/60',
};

const ageText = (ms: number | null): string => {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms ago`;
  if (ms < 120000) return `${Math.round(ms / 1000)}s ago`;
  return `${Math.round(ms / 60000)}m ago`;
};

const venueStatus = (v: unknown): HealthStatus => (v === true ? 'LIVE' : v === false ? 'STALE' : 'UNKNOWN');

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const ChangelogView: React.FC<ChangelogViewProps> = ({ onOpenTerminal }) => {
  const [filterCategory, setFilterCategory] = useState<'ALL' | Category>('ALL');
  const [engine, setEngine] = useState<any>(null);
  const [engineState, setEngineState] = useState<'LOADING' | 'OK' | 'UNREACHABLE'>('LOADING');
  const [model, setModel] = useState<{ settledCount: number; minRequired: number; hasActiveModel: boolean; brier: number | null } | null>(null);
  const [modelState, setModelState] = useState<'LOADING' | 'OK' | 'UNREACHABLE'>('LOADING');
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [e, m] = await Promise.all([
        fetch('/api/vixy/15m/current', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/model-status?asset=BTC&desk=15m', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (!alive) return;
      if (e && typeof e === 'object') {
        setEngine(e);
        setEngineState('OK');
      } else {
        setEngine(null);
        setEngineState('UNREACHABLE');
      }
      if (m && typeof m.settledCount === 'number' && typeof m.minRequired === 'number') {
        setModel({
          settledCount: m.settledCount,
          minRequired: m.minRequired,
          hasActiveModel: m.hasActiveModel === true,
          brier: typeof m.activeModelBrier === 'number' ? m.activeModelBrier : null,
        });
        setModelState('OK');
      } else {
        setModel(null);
        setModelState('UNREACHABLE');
      }
      setCheckedAt(Date.now());
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const now = checkedAt ?? Date.now();
  const serviceNames: Array<[string, React.ElementType]> = [
    ['15-minute decision engine', Cpu],
    ['BTC spot price', Radio],
    ['ETH spot price', Radio],
    ['SOL spot price', Radio],
    ['Kalshi market data', Database],
    ['Kalshi strike', Server],
  ];

  const services: ServiceRow[] = (() => {
    if (engineState === 'LOADING') {
      return serviceNames.map(([name, icon]) => ({ name, source: '—', status: 'UNKNOWN' as HealthStatus, detail: 'Checking…', icon }));
    }
    if (engineState === 'UNREACHABLE' || !engine) {
      return serviceNames.map(([name, icon]) => ({ name, source: '—', status: 'DOWN' as HealthStatus, detail: 'The engine endpoint did not answer.', icon }));
    }
    const fh = engine.feedHealth || {};
    const venues = fh.venues || {};
    const tickAge = typeof engine.engineTickTs === 'number' && engine.engineTickTs > 0 ? Math.max(0, now - engine.engineTickTs) : null;
    const dataAge = typeof fh.dataAgeMs === 'number' ? fh.dataAgeMs : null;
    const market = engine.marketRead;
    const strikeResolved = engine.lockGate?.strikeResolved;
    return [
      {
        name: '15-minute decision engine',
        source: 'Engine tick',
        status: tickAge === null ? 'UNKNOWN' : tickAge < ENGINE_STALE_MS ? 'LIVE' : 'STALE',
        detail: tickAge === null ? 'No tick timestamp reported.' : `Last tick ${ageText(tickAge)}`,
        icon: Cpu,
      },
      {
        name: 'BTC spot price',
        source: fh.priceSource ? `${fh.priceSource} · first venue to answer` : 'Venue fallback chain',
        status: venueStatus(venues.btc),
        detail: dataAge !== null ? `Data ${ageText(dataAge)}` : 'No data age reported.',
        icon: Radio,
      },
      { name: 'ETH spot price', source: 'Cross-asset feed', status: venueStatus(venues.eth), detail: venues.eth === true ? 'Fresh' : venues.eth === false ? 'Not fresh' : 'Not reported', icon: Radio },
      { name: 'SOL spot price', source: 'Cross-asset feed', status: venueStatus(venues.sol), detail: venues.sol === true ? 'Fresh' : venues.sol === false ? 'Not fresh' : 'Not reported', icon: Radio },
      {
        name: 'Kalshi market data',
        source: 'Kalshi public API',
        status: venueStatus(venues.kalshi),
        detail: market?.real === true && typeof market.ageMs === 'number' ? `Last price read ${ageText(market.ageMs)}` : 'No fresh price read',
        icon: Database,
      },
      {
        name: 'Kalshi strike',
        source: 'Lock gate',
        status: strikeResolved === true ? 'LIVE' : strikeResolved === false ? 'PENDING' : 'UNKNOWN',
        detail:
          strikeResolved === true
            ? `Resolved${engine.lockGate?.strikeSource ? ` · ${engine.lockGate.strikeSource}` : ''}`
            : strikeResolved === false
            ? 'Not resolved yet this cycle'
            : 'Not reported',
        icon: Server,
      },
    ];
  })();

  const liveCount = services.filter((s) => s.status === 'LIVE').length;
  const engineRow = services[0];
  const headerBadge =
    engineState === 'LOADING'
      ? { text: 'CHECKING…', cls: 'bg-slate-800/60 text-slate-300 border-slate-600/40', dot: 'bg-slate-400' }
      : engineState === 'UNREACHABLE'
      ? { text: 'ENGINE UNREACHABLE', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40', dot: 'bg-rose-400' }
      : engineRow.status === 'LIVE'
      ? { text: `ENGINE LIVE · ${liveCount}/${services.length} FEEDS LIVE`, cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400 animate-pulse' }
      : { text: `ENGINE ${engineRow.status} · ${liveCount}/${services.length} FEEDS LIVE`, cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-400' };

  const pct = model && model.minRequired > 0 ? Math.min(100, Math.round((model.settledCount / model.minRequired) * 100)) : null;
  const remaining = model ? Math.max(0, model.minRequired - model.settledCount) : null;

  const filteredReleases = RELEASES.map((g) => ({
    ...g,
    changes: filterCategory === 'ALL' ? g.changes : g.changes.filter((c) => c.category === filterCategory),
  })).filter((g) => g.changes.length > 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#140b2e] via-[#100726] to-[#140b2e] border-2 border-purple-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold ${headerBadge.cls}`}>
              <span className={`w-2 h-2 rounded-full ${headerBadge.dot}`} />
              <span>{headerBadge.text}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">System Status & Changelog</h1>
            <p className="text-sm text-purple-200/80 max-w-2xl leading-relaxed">
              Feed health read from the live engine every 10 seconds, the calibration sample, and the changes that have shipped.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono">
            {onOpenTerminal && (
              <button
                onClick={onOpenTerminal}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
              >
                <span>Launch Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Health grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono font-bold text-purple-300/80 uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            <span>Engine & Data Feeds</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {checkedAt ? `Checked ${new Date(checkedAt).toLocaleTimeString()}` : 'Checking…'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.name}
                className="bg-[#0a0518] border border-purple-900/40 hover:border-purple-500/40 p-4 rounded-2xl flex items-start justify-between gap-3 transition-all shadow-md"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-bold text-white truncate">{service.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/40 text-purple-300 inline-block">{service.source}</span>
                    <span className="block">{service.detail}</span>
                  </div>
                </div>
                <div className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold border px-2.5 py-1 rounded-full ${STATUS_STYLE[service.status]}`}>
                  <span>{service.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calibration sample */}
      <div className="bg-[#0c0620] border-2 border-purple-500/30 rounded-2xl p-6 space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Calibration sample</h3>
                {model && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                      model.hasActiveModel ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {model.hasActiveModel ? 'CALIBRATED' : 'COLLECTING'}
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-300/70 font-sans">Settled BTC 15-minute locks counted toward a calibrated model.</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-2xl font-black text-emerald-400">{model ? `${model.settledCount} / ${model.minRequired}` : '—'}</span>
            <span className="text-xs text-slate-400 block font-sans">
              {model ? `Settled locks (${pct}%)` : modelState === 'LOADING' ? 'Loading…' : 'Model status unavailable'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
            <span>Required for a calibrated model{model ? ` (n=${model.minRequired})` : ''}</span>
            <span className="font-mono text-purple-300 font-bold">{pct !== null ? `${pct}%` : '—'}</span>
          </div>
          <div className="w-full h-3 bg-purple-950 rounded-full overflow-hidden p-0.5 border border-purple-800/40">
            <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct ?? 0}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-[#0a0518] p-3 rounded-xl border border-purple-900/30">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Brier score (settled locks)</span>
            <span className="text-white font-black text-sm">{model && model.brier !== null ? `${model.brier.toFixed(3)} (n=${model.settledCount})` : '—'}</span>
          </div>
          <div className="bg-[#0a0518] p-3 rounded-xl border border-purple-900/30">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Still needed</span>
            <span className="text-emerald-300 font-black text-sm">{remaining === null ? '—' : remaining === 0 ? 'Reached' : `${remaining} settled locks`}</span>
          </div>
          <div className="bg-[#0a0518] p-3 rounded-xl border border-purple-900/30">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Model status</span>
            <span className="text-purple-300 font-black text-sm">{model ? (model.hasActiveModel ? 'Calibrated' : 'Collecting data') : '—'}</span>
          </div>
        </div>
      </div>

      {/* Release timeline */}
      <div className="space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-3">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <span>What shipped</span>
          </h2>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400 font-sans">Category:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-xl border text-xs font-bold transition-all ${
                  filterCategory === cat
                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-[#0c0620] border-purple-900/50 text-purple-300/70 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredReleases.map((group) => (
            <div
              key={`${group.date}-${group.title}`}
              className="bg-[#0a0518] border border-purple-900/50 hover:border-purple-500/40 rounded-2xl p-6 space-y-4 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/30 pb-3">
                <h3 className="text-base font-bold text-white">{group.title}</h3>
                <span className="text-xs text-slate-400">{formatDate(group.date)}</span>
              </div>

              <ul className="space-y-1.5">
                {group.changes.map((ch) => (
                  <li key={ch.pr} className="flex items-start gap-2 text-xs text-purple-200/90">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="flex-1">{ch.text}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">#{ch.pr}</span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/40 text-purple-300">{ch.category}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 rounded-xl bg-[#0a0518] border border-purple-900/40 text-[11px] font-mono text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-purple-300">Data sources:</strong> spot prices come from Coinbase, with Kraken, CoinGecko and Binance as fallbacks, and contract prices from Kalshi. It has no Polymarket feed. No prediction accuracy is guaranteed.
        </p>
      </div>
    </div>
  );
};
