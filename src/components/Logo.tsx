import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  className = '',
  onClick,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group shrink-0 whitespace-nowrap ${className}`}
    >
      {/* VIXY'S VAULT Emblem SVG */}
      <div
        className={`${iconSizes[size]} relative rounded-xl bg-gradient-to-br from-[#A855F7] via-[#6366F1] to-[#0D071E] p-[1.5px] shadow-md shadow-purple-600/30 group-hover:shadow-purple-500/60 transition-all duration-300 flex items-center justify-center shrink-0`}
      >
        <div className="w-full h-full bg-[#0D071E] rounded-[10px] flex items-center justify-center overflow-hidden relative">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-radial from-purple-600/40 via-transparent to-transparent opacity-90" />

          <svg
            viewBox="0 0 100 100"
            className="w-4/5 h-4/5 relative z-10 filter drop-shadow-[0_2px_6px_rgba(168,85,247,0.7)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="vixyVaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D8B4FE" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id="vixyRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C084FC" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#818CF8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#C084FC" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Outer Ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#vixyRingGrad)"
              strokeWidth="3"
              strokeDasharray="180 30"
            />

            {/* Signal Waves */}
            <path
              d="M 36 36 A 18 18 0 0 1 64 36"
              stroke="#F3E8FF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 41 43 A 11 11 0 0 1 59 43"
              stroke="#C084FC"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* V Emblem */}
            <path
              d="M 22 24 L 42 76 C 45 83, 55 83, 58 76 L 78 24 C 80 19, 74 18, 71 23 L 50 67 L 29 23 C 26 18, 20 19, 22 24 Z"
              fill="url(#vixyVaultGrad)"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />

            {/* Keyhole */}
            <circle cx="50" cy="54" r="4" fill="#0D071E" stroke="url(#vixyVaultGrad)" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="font-mono flex flex-col justify-center leading-tight whitespace-nowrap">
          <div className="flex items-center gap-1.5 font-black tracking-tight text-white">
            <span className={`${titleSizes[size]} text-white`}>VIXY'S</span>
            <span className={`${titleSizes[size]} text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300`}>
              VAULT
            </span>
            <span className="px-1.5 py-0.2 text-[9px] rounded font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase tracking-widest hidden sm:inline-block">
              PRO
            </span>
          </div>

          {showSubtitle && (
            <p className="text-[9px] text-purple-300/70 font-sans tracking-wider uppercase font-bold mt-0.5 whitespace-nowrap">
              Decision Intelligence
            </p>
          )}
        </div>
      )}
    </div>
  );
};

