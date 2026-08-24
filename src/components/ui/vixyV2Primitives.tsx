import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight, 
  Search, 
  Info, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  Activity,
  Maximize2
} from 'lucide-react';

/* ============================================================================
 * VIXY VAULT 2.0 DESIGN SYSTEM PRIMITIVES
 * Restrained, Institutional, Dark Graphite, Quantitative Trading Aesthetics
 * ============================================================================ */

/* ----------------------------------------------------------------------------
 * 1. PANELS & CONTAINERS
 * ---------------------------------------------------------------------------- */
export interface V2PanelProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
  badge?: string;
  badgeType?: 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'neutral';
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  borderVariant?: 'default' | 'subtle' | 'accent-purple' | 'accent-emerald' | 'accent-amber';
}

export const V2Panel: React.FC<V2PanelProps> = ({
  children,
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeType = 'purple',
  action,
  className = '',
  bodyClassName = '',
  padding = 'md',
  borderVariant = 'default',
}) => {
  const borderClasses = {
    default: 'border-purple-900/30 hover:border-purple-800/50',
    subtle: 'border-slate-800/60 hover:border-slate-700/80',
    'accent-purple': 'border-purple-600/40 shadow-[0_0_20px_rgba(147,51,234,0.1)]',
    'accent-emerald': 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    'accent-amber': 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]',
  }[borderVariant];

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-8',
  }[padding];

  return (
    <div
      className={`bg-[#0c0818]/90 backdrop-blur-md border rounded-2xl transition-all duration-200 relative overflow-hidden ${borderClasses} ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-purple-900/30 bg-[#080512]/50">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-purple-400 shrink-0" />}
            {title && (
              <h3 className="text-xs font-bold font-sans text-slate-100 uppercase tracking-wider truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-[11px] text-slate-400 font-medium truncate hidden sm:inline">
                • {subtitle}
              </span>
            )}
            {badge && (
              <V2Badge variant={badgeType} size="xs">
                {badge}
              </V2Badge>
            )}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={`${paddingClasses} ${bodyClassName}`}>{children}</div>
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 2. BUTTONS
 * ---------------------------------------------------------------------------- */
export interface V2ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'amber';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ElementType;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const V2Button: React.FC<V2ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-mono font-bold tracking-wider uppercase transition-all duration-150 rounded-xl cursor-pointer active:scale-98 disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizeClasses = {
    xs: 'px-2 py-1 text-[10px] gap-1 rounded-lg',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs gap-2',
    lg: 'px-5 py-3 text-sm gap-2.5 rounded-2xl',
  }[size];

  const variantClasses = {
    primary:
      'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 border border-purple-400/30',
    secondary:
      'bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 border border-slate-700/60 hover:text-white',
    outline:
      'bg-transparent border border-purple-800/60 hover:border-purple-500/80 text-purple-300 hover:text-white hover:bg-purple-950/30',
    ghost:
      'bg-transparent hover:bg-purple-950/30 text-slate-400 hover:text-slate-100',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 border border-rose-400/30',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 border border-emerald-400/30',
    amber:
      'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 border border-amber-300',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
      <span>{children}</span>
      {!isLoading && Icon && iconPosition === 'right' ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
    </button>
  );
};

/* ----------------------------------------------------------------------------
 * 3. BADGES
 * ---------------------------------------------------------------------------- */
export interface V2BadgeProps {
  children: React.ReactNode;
  variant?: 'purple' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'neutral' | 'pro' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const V2Badge: React.FC<V2BadgeProps> = ({
  children,
  variant = 'purple',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2.5 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  }[size];

  const variantClasses = {
    purple: 'bg-purple-950/80 border border-purple-700/60 text-purple-300',
    emerald: 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300',
    rose: 'bg-rose-950/80 border border-rose-700/60 text-rose-300',
    amber: 'bg-amber-950/80 border border-amber-700/60 text-amber-300',
    cyan: 'bg-cyan-950/80 border border-cyan-700/60 text-cyan-300',
    neutral: 'bg-slate-900/80 border border-slate-700/60 text-slate-300',
    pro: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black border border-purple-400/40 shadow-sm shadow-purple-500/20',
    outline: 'bg-transparent border border-purple-800/40 text-purple-300',
  }[variant];

  const dotColors = {
    purple: 'bg-purple-400',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    cyan: 'bg-cyan-400',
    neutral: 'bg-slate-400',
    pro: 'bg-amber-300',
    outline: 'bg-purple-400',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider rounded-lg select-none ${sizeClasses} ${variantClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors} animate-pulse`} />}
      <span>{children}</span>
    </span>
  );
};

/* ----------------------------------------------------------------------------
 * 4. QUANT METRIC CARDS
 * ---------------------------------------------------------------------------- */
export interface V2MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'accent' | 'emerald' | 'rose' | 'amber';
  className?: string;
}

export const V2MetricCard: React.FC<V2MetricCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  subtext,
  icon: Icon,
  variant = 'default',
  className = '',
}) => {
  const borderClasses = {
    default: 'border-purple-900/30 hover:border-purple-800/50',
    accent: 'border-purple-500/40 bg-gradient-to-b from-purple-950/30 to-[#0c0818]',
    emerald: 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-[#0c0818]',
    rose: 'border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-[#0c0818]',
    amber: 'border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-[#0c0818]',
  }[variant];

  return (
    <div
      className={`bg-[#0c0818]/90 border rounded-2xl p-4 transition-all duration-200 relative overflow-hidden ${borderClasses} ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest truncate">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-purple-400/80 shrink-0" />}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-mono font-extrabold text-slate-100 tracking-tight">
          {value}
        </span>
        {change && (
          <span
            className={`text-xs font-mono font-bold ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {change}
          </span>
        )}
      </div>

      {subtext && (
        <div className="text-[10px] text-slate-500 font-mono mt-1.5 truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 5. TABS / SEGMENT CONTROLS
 * ---------------------------------------------------------------------------- */
export interface V2TabItem {
  id: string;
  label: string;
  badge?: string;
  icon?: React.ElementType;
}

export interface V2TabsProps {
  tabs: V2TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline' | 'boxes';
  size?: 'sm' | 'md';
  className?: string;
}

export const V2Tabs: React.FC<V2TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  size = 'md',
  className = '',
}) => {
  if (variant === 'pills') {
    return (
      <div
        className={`inline-flex items-center gap-1 bg-[#080512] border border-purple-900/40 p-1 rounded-xl font-mono text-xs ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-purple-950/30'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-purple-800 text-purple-200' : 'bg-purple-950 text-purple-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex border-b border-purple-900/30 gap-4 font-mono text-xs ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 pb-2.5 font-bold transition-all duration-150 cursor-pointer border-b-2 ${
              isActive
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 6. STATUS INDICATORS
 * ---------------------------------------------------------------------------- */
export interface V2StatusIndicatorProps {
  status: 'live' | 'building' | 'confirming' | 'locked' | 'settled' | 'degraded' | 'offline';
  label?: string;
  size?: 'sm' | 'md';
}

export const V2StatusIndicator: React.FC<V2StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const config = {
    live: { color: 'bg-emerald-400', text: 'text-emerald-300', defaultLabel: 'LIVE ENGINE' },
    building: { color: 'bg-cyan-400', text: 'text-cyan-300', defaultLabel: 'BUILDING' },
    confirming: { color: 'bg-indigo-400', text: 'text-indigo-300', defaultLabel: 'CONFIRMING' },
    locked: { color: 'bg-amber-400', text: 'text-amber-300', defaultLabel: 'LOCKED' },
    settled: { color: 'bg-purple-400', text: 'text-purple-300', defaultLabel: 'SETTLED' },
    degraded: { color: 'bg-amber-500', text: 'text-amber-400', defaultLabel: 'DEGRADED' },
    offline: { color: 'bg-rose-500', text: 'text-rose-400', defaultLabel: 'OFFLINE' },
  }[status];

  return (
    <div className="inline-flex items-center gap-2 font-mono font-bold text-xs">
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
      </span>
      <span className={`${config.text} uppercase tracking-wider text-[10px]`}>
        {label || config.defaultLabel}
      </span>
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 7. INPUTS & SEARCH
 * ---------------------------------------------------------------------------- */
export interface V2InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  shortcut?: string;
  error?: string;
}

export const V2Input: React.FC<V2InputProps> = ({
  icon: Icon = Search,
  shortcut,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      <div className="relative flex items-center">
        {Icon && (
          <Icon className="w-4 h-4 text-purple-400 absolute left-3 pointer-events-none" />
        )}
        <input
          className={`w-full bg-[#080512] border border-purple-900/40 focus:border-purple-500 text-slate-100 placeholder-slate-500 font-mono text-xs rounded-xl py-2 ${
            Icon ? 'pl-9' : 'pl-3'
          } ${shortcut ? 'pr-12' : 'pr-3'} outline-none transition-all duration-150 ${className}`}
          {...props}
        />
        {shortcut && (
          <span className="absolute right-3 text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            {shortcut}
          </span>
        )}
      </div>
      {error && <span className="text-[10px] text-rose-400 font-mono mt-1 block">{error}</span>}
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 8. TOOLTIPS
 * ---------------------------------------------------------------------------- */
export interface V2TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export const V2Tooltip: React.FC<V2TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute z-50 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 border border-purple-800/60 text-slate-200 text-[10px] font-mono rounded-lg shadow-xl whitespace-nowrap pointer-events-none transition-opacity duration-150 ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 9. CHART CONTAINERS
 * ---------------------------------------------------------------------------- */
export interface V2ChartContainerProps {
  title?: string;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  children: React.ReactNode;
  height?: string;
  className?: string;
}

export const V2ChartContainer: React.FC<V2ChartContainerProps> = ({
  title = 'BTC/USDT 15M CANDLESTICK',
  timeframe = '15m',
  onTimeframeChange,
  children,
  height = 'h-80 sm:h-96',
  className = '',
}) => {
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <V2Panel
      padding="none"
      title={title}
      action={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#080512] p-0.5 rounded-lg border border-purple-900/40">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange?.(tf)}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer ${
                  timeframe === tf
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-purple-900/30">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      }
      className={className}
    >
      <div className={`w-full ${height} relative bg-[#06030d]`}>{children}</div>
    </V2Panel>
  );
};

/* ----------------------------------------------------------------------------
 * 10. LOADING STATES
 * ---------------------------------------------------------------------------- */
export const V2LoadingState: React.FC<{ label?: string }> = ({ label = 'SYNCING TELEMETRY...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3 font-mono text-xs text-purple-300">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-purple-600/30 border-t-purple-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-cyan-500/30 border-b-cyan-400 animate-spin" style={{ animationDirection: 'reverse' }} />
      </div>
      <span className="font-bold tracking-widest uppercase text-[10px] text-purple-400 animate-pulse">
        {label}
      </span>
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 11. ERROR STATES
 * ---------------------------------------------------------------------------- */
export const V2ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'TELEMETRY DISCONNECTED', onRetry }) => {
  return (
    <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-center justify-between font-mono text-xs text-rose-300">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <V2Button size="xs" variant="danger" icon={RefreshCw} onClick={onRetry}>
          RECONNECT
        </V2Button>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 12. EMPTY STATES
 * ---------------------------------------------------------------------------- */
export const V2EmptyState: React.FC<{
  title?: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title = 'NO DATA AVAILABLE', description = 'Waiting for cycle synchronization.', action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 font-mono">
      <Info className="w-8 h-8 text-purple-400/60" />
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</h4>
      <p className="text-[11px] text-slate-500 max-w-xs">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * 13. LOCKED STATES (ENTITLEMENT PREVIEW)
 * ---------------------------------------------------------------------------- */
export const V2LockedState: React.FC<{
  featureName: string;
  requiredTier?: string;
  onUnlock?: () => void;
  children?: React.ReactNode;
}> = ({ featureName, requiredTier = 'PRO TERMINAL', onUnlock, children }) => {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-purple-900/40">
      {/* Blurred background preview */}
      <div className="filter blur-md opacity-30 pointer-events-none select-none">
        {children || (
          <div className="h-64 bg-[#0a0518] p-6 space-y-4">
            <div className="h-8 bg-purple-900/30 rounded w-1/3" />
            <div className="h-32 bg-purple-900/20 rounded w-full" />
            <div className="h-10 bg-purple-900/30 rounded w-1/2" />
          </div>
        )}
      </div>

      {/* Lock overlay banner */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#0a0518]/85 backdrop-blur-md text-center font-mono space-y-3">
        <div className="p-3 rounded-2xl bg-purple-950 border border-purple-700/60 text-purple-300 shadow-xl">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-purple-400 font-bold uppercase tracking-widest">
            {requiredTier} ACCESS REQUIRED
          </div>
          <h3 className="text-base font-bold text-white uppercase">{featureName}</h3>
        </div>
        <V2Button variant="amber" size="sm" icon={Sparkles} onClick={onUnlock}>
          UNLOCK {featureName}
        </V2Button>
      </div>
    </div>
  );
};
