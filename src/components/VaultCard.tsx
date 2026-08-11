import React from 'react';

export type VaultAccent = 'cyan' | 'purple' | 'green' | 'red' | 'amber';

export interface VaultCardProps {
  accent?: VaultAccent;
  icon?: React.ReactNode;
  title: string;
  titleRight?: React.ReactNode;
  statusText?: string;
  statusActive?: boolean;
  heroValue: React.ReactNode;
  heroSubtitle?: string;
  actionPill?: React.ReactNode;
  subLabel?: string;
  subValue?: React.ReactNode;
  progressPct?: number;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  isPulsingPill?: boolean;
  className?: string;
}

interface VaultAccentStyle {
  bgGradient: string;
  borderColor: string;
  outerShadow: string;
  ambientGlow: string;
  titleText: string;
  statusDotBg: string;
  statusDotGlow: string;
  statusText: string;
  heroText: string;
  heroGlow: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  pillShadow: string;
  subLabelText: string;
  subValueText: string;
  progressTrackBg: string;
  progressTrackBorder: string;
  progressFillGradient: string;
  progressFillGlow: string;
  footerBorder: string;
  footerLeftText: string;
  footerRightText: string;
  footerRightGlow: string;
}

const ACCENT_STYLES: Record<VaultAccent, VaultAccentStyle> = {
  cyan: {
    bgGradient: 'bg-gradient-to-b from-[#081a2e] via-[#051120] to-[#040314]',
    borderColor: 'border-cyan-500/80',
    outerShadow: 'shadow-[0_0_25px_rgba(6,182,212,0.35)]',
    ambientGlow: 'bg-cyan-500/10',
    titleText: 'text-cyan-300',
    statusDotBg: 'bg-cyan-400',
    statusDotGlow: 'shadow-[0_0_8px_#22d3ee]',
    statusText: 'text-cyan-400',
    heroText: 'text-cyan-300',
    heroGlow: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]',
    pillBg: 'bg-cyan-950/90',
    pillBorder: 'border-cyan-500/60',
    pillText: 'text-cyan-200',
    pillShadow: 'shadow-[0_0_10px_rgba(6,182,212,0.2)]',
    subLabelText: 'text-cyan-200/90',
    subValueText: 'text-cyan-300',
    progressTrackBg: 'bg-cyan-950/80',
    progressTrackBorder: 'border-cyan-800/80',
    progressFillGradient: 'bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-300',
    progressFillGlow: 'shadow-[0_0_8px_#22d3ee]',
    footerBorder: 'border-cyan-900/50',
    footerLeftText: 'text-cyan-300/80',
    footerRightText: 'text-emerald-400',
    footerRightGlow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]',
  },
  purple: {
    bgGradient: 'bg-gradient-to-b from-[#180a2c] via-[#0f061e] to-[#060312]',
    borderColor: 'border-purple-500/80',
    outerShadow: 'shadow-[0_0_25px_rgba(168,85,247,0.35)]',
    ambientGlow: 'bg-purple-500/10',
    titleText: 'text-purple-300',
    statusDotBg: 'bg-purple-400',
    statusDotGlow: 'shadow-[0_0_8px_#c084fc]',
    statusText: 'text-purple-300',
    heroText: 'text-purple-300',
    heroGlow: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]',
    pillBg: 'bg-purple-950/90',
    pillBorder: 'border-purple-500/60',
    pillText: 'text-purple-200',
    pillShadow: 'shadow-[0_0_10px_rgba(168,85,247,0.2)]',
    subLabelText: 'text-purple-200/90',
    subValueText: 'text-purple-300',
    progressTrackBg: 'bg-purple-950/80',
    progressTrackBorder: 'border-purple-800/80',
    progressFillGradient: 'bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-300',
    progressFillGlow: 'shadow-[0_0_8px_#c084fc]',
    footerBorder: 'border-purple-900/50',
    footerLeftText: 'text-purple-300/80',
    footerRightText: 'text-purple-200',
    footerRightGlow: 'drop-shadow-[0_0_8px_rgba(192,132,252,0.4)]',
  },
  green: {
    bgGradient: 'bg-gradient-to-b from-[#062419] via-[#04160f] to-[#020d09]',
    borderColor: 'border-emerald-500/80',
    outerShadow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
    ambientGlow: 'bg-emerald-500/10',
    titleText: 'text-emerald-300',
    statusDotBg: 'bg-emerald-400',
    statusDotGlow: 'shadow-[0_0_8px_#34d399]',
    statusText: 'text-emerald-400',
    heroText: 'text-emerald-300',
    heroGlow: 'drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    pillBg: 'bg-emerald-950/90',
    pillBorder: 'border-emerald-500/60',
    pillText: 'text-emerald-200',
    pillShadow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    subLabelText: 'text-emerald-200/90',
    subValueText: 'text-emerald-300',
    progressTrackBg: 'bg-emerald-950/80',
    progressTrackBorder: 'border-emerald-800/80',
    progressFillGradient: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300',
    progressFillGlow: 'shadow-[0_0_8px_#34d399]',
    footerBorder: 'border-emerald-900/50',
    footerLeftText: 'text-emerald-300/80',
    footerRightText: 'text-emerald-300',
    footerRightGlow: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]',
  },
  red: {
    bgGradient: 'bg-gradient-to-b from-[#290814] via-[#1a050d] to-[#0a0205]',
    borderColor: 'border-rose-500/80',
    outerShadow: 'shadow-[0_0_25px_rgba(244,63,94,0.35)]',
    ambientGlow: 'bg-rose-500/10',
    titleText: 'text-rose-300',
    statusDotBg: 'bg-rose-400',
    statusDotGlow: 'shadow-[0_0_8px_#fb7185]',
    statusText: 'text-rose-400',
    heroText: 'text-rose-300',
    heroGlow: 'drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]',
    pillBg: 'bg-rose-950/90',
    pillBorder: 'border-rose-500/60',
    pillText: 'text-rose-200',
    pillShadow: 'shadow-[0_0_10px_rgba(244,63,94,0.2)]',
    subLabelText: 'text-rose-200/90',
    subValueText: 'text-rose-300',
    progressTrackBg: 'bg-rose-950/80',
    progressTrackBorder: 'border-rose-800/80',
    progressFillGradient: 'bg-gradient-to-r from-rose-500 via-pink-400 to-rose-300',
    progressFillGlow: 'shadow-[0_0_8px_#fb7185]',
    footerBorder: 'border-rose-900/50',
    footerLeftText: 'text-rose-300/80',
    footerRightText: 'text-rose-300',
    footerRightGlow: 'drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]',
  },
  amber: {
    bgGradient: 'bg-gradient-to-b from-[#261805] via-[#180e03] to-[#0a0601]',
    borderColor: 'border-amber-500/80',
    outerShadow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
    ambientGlow: 'bg-amber-500/10',
    titleText: 'text-amber-300',
    statusDotBg: 'bg-amber-400',
    statusDotGlow: 'shadow-[0_0_8px_#fbbf24]',
    statusText: 'text-amber-400',
    heroText: 'text-amber-300',
    heroGlow: 'drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]',
    pillBg: 'bg-amber-950/90',
    pillBorder: 'border-amber-500/60',
    pillText: 'text-amber-200',
    pillShadow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    subLabelText: 'text-amber-200/90',
    subValueText: 'text-amber-300',
    progressTrackBg: 'bg-amber-950/80',
    progressTrackBorder: 'border-amber-800/80',
    progressFillGradient: 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300',
    progressFillGlow: 'shadow-[0_0_8px_#fbbf24]',
    footerBorder: 'border-amber-900/50',
    footerLeftText: 'text-amber-300/80',
    footerRightText: 'text-amber-300',
    footerRightGlow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]',
  },
};

export const VaultCard: React.FC<VaultCardProps> = ({
  accent = 'purple',
  icon,
  title,
  titleRight,
  statusText,
  statusActive = true,
  heroValue,
  heroSubtitle,
  actionPill,
  subLabel,
  subValue,
  progressPct,
  footerLeft,
  footerRight,
  isPulsingPill = false,
  className = '',
}) => {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.purple;
  const clampedProgress = progressPct !== undefined ? Math.min(100, Math.max(0, progressPct)) : undefined;

  return (
    <div className={`${styles.bgGradient} p-4 rounded-2xl border-2 ${styles.borderColor} ${styles.outerShadow} space-y-2 flex flex-col justify-between relative overflow-hidden font-mono shadow-xl transition-all duration-300 ${className}`}>
      {/* Corner Ambient Glow */}
      <div className={`absolute top-0 right-0 w-24 h-24 ${styles.ambientGlow} blur-xl pointer-events-none rounded-full`} />

      {/* Header Row */}
      <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase relative z-10">
        <span className={`flex items-center gap-1.5 ${styles.titleText} font-black tracking-wider`}>
          {icon && <span className="text-amber-400">{icon}</span>}
          {title}
        </span>
        {statusText ? (
          <span className="flex items-center gap-1">
            {statusActive && (
              <span className={`w-2 h-2 rounded-full ${styles.statusDotBg} animate-pulse ${styles.statusDotGlow}`} />
            )}
            <span className={`text-[9px] ${styles.statusText} font-extrabold`}>{statusText}</span>
          </span>
        ) : titleRight ? (
          <span className="text-purple-400/70">{titleRight}</span>
        ) : null}
      </div>

      {/* Hero Metric Row */}
      <div className="flex items-center justify-between gap-2 relative z-10 my-0.5">
        <div>
          <div className={`text-3xl font-black font-mono ${styles.heroText} ${styles.heroGlow} tracking-tight transition-all duration-300`}>
            {heroValue}
          </div>
          {heroSubtitle && (
            <div className="text-[10px] font-bold tracking-wider text-purple-300/70 uppercase">
              {heroSubtitle}
            </div>
          )}
        </div>
        {actionPill && (
          <div
            className={`px-2 py-1 rounded-md ${styles.pillBg} border ${styles.pillBorder} ${styles.pillText} text-[10px] font-black tracking-wider ${styles.pillShadow} ${
              isPulsingPill ? 'animate-pulse' : ''
            }`}
          >
            {actionPill}
          </div>
        )}
      </div>

      {/* Labeled Sub-metric & Progress Bar */}
      {(subLabel || subValue || clampedProgress !== undefined) && (
        <div className="space-y-1 relative z-10">
          {(subLabel || subValue) && (
            <div className={`text-[10px] font-mono ${styles.subLabelText} font-bold flex justify-between`}>
              <span>{subLabel}</span>
              {subValue && <span className={`${styles.subValueText} font-extrabold`}>{subValue}</span>}
            </div>
          )}
          {clampedProgress !== undefined && (
            <div className={`w-full ${styles.progressTrackBg} h-2 rounded-full overflow-hidden border ${styles.progressTrackBorder} shadow-inner`}>
              <div
                className={`${styles.progressFillGradient} h-full ${styles.progressFillGlow} transition-all duration-500 ease-out`}
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Footer Row */}
      {(footerLeft || footerRight) && (
        <div className={`flex items-center justify-between text-[10px] font-mono pt-1 border-t ${styles.footerBorder} relative z-10`}>
          <span className={styles.footerLeftText}>{footerLeft}</span>
          <span className={`${styles.footerRightText} font-black ${styles.footerRightGlow}`}>{footerRight}</span>
        </div>
      )}
    </div>
  );
};
