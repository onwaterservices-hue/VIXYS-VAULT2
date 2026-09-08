import React from "react";

/**
 * VIXY - the Vault's mascot. Original character: a holographic violet orb with
 * the V-visor from the wordmark. Bobs, winks every few seconds, does a little
 * jump now and then. Pure SVG + CSS; no assets, no network, reduced-motion safe.
 */
export default function VixyMascot({ size = 132 }: { size?: number }) {
  return (
    <div className="vixy-mascot" style={{ width: size, height: size }} aria-hidden>
      <style>{`
        .vixy-mascot { position: relative; display: inline-block; }
        .vixy-mascot svg { width: 100%; height: 100%; overflow: visible; }
        .vm-body { animation: vmBob 3.2s ease-in-out infinite, vmJump 7s ease-in-out infinite; transform-origin: 50% 100%; }
        .vm-eye { transform-origin: center; animation: vmBlink 4.5s ease-in-out infinite; }
        .vm-eye.r { animation: vmWink 6s ease-in-out infinite; }
        .vm-glow { animation: vmGlow 3.2s ease-in-out infinite; }
        .vm-scan { animation: vmScan 2.4s linear infinite; }
        .vm-shadow { animation: vmShadow 7s ease-in-out infinite; transform-origin: center; }
        @keyframes vmBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes vmJump { 0%,78%,100% { transform: translateY(0) scale(1,1) } 82% { transform: translateY(2px) scale(1.08,.9) } 88% { transform: translateY(-22px) scale(.94,1.08) } 94% { transform: translateY(0) scale(1.06,.94) } }
        @keyframes vmShadow { 0%,78%,100% { transform: scaleX(1); opacity:.5 } 88% { transform: scaleX(.55); opacity:.2 } }
        @keyframes vmBlink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(.1) } }
        @keyframes vmWink { 0%,60%,100% { transform: scaleY(1) } 64%,70% { transform: scaleY(.08) } }
        @keyframes vmGlow { 0%,100% { opacity:.55 } 50% { opacity:.9 } }
        @keyframes vmScan { 0% { transform: translateY(-40px) } 100% { transform: translateY(60px) } }
        @media (prefers-reduced-motion: reduce) { .vm-body,.vm-eye,.vm-glow,.vm-scan,.vm-shadow { animation: none !important; } }
      `}</style>
      <svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="vmG" cx="40%" cy="32%" r="70%">
            <stop offset="0" stopColor="#c4b5fd" /><stop offset=".45" stopColor="#8b5cf6" /><stop offset="1" stopColor="#3b1d7a" />
          </radialGradient>
          <linearGradient id="vmV" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5f3ff" /><stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <clipPath id="vmClip"><circle cx="60" cy="58" r="44" /></clipPath>
        </defs>
        <ellipse className="vm-shadow" cx="60" cy="118" rx="30" ry="6" fill="#8b5cf6" opacity=".5" />
        <g className="vm-body">
          <circle className="vm-glow" cx="60" cy="58" r="52" fill="#8b5cf6" opacity=".6" style={{ filter: "blur(14px)" }} />
          <circle cx="60" cy="58" r="44" fill="url(#vmG)" stroke="#ddd6fe" strokeOpacity=".5" strokeWidth="1.2" />
          <g clipPath="url(#vmClip)"><rect className="vm-scan" x="10" y="0" width="100" height="10" fill="#fff" opacity=".10" /></g>
          <path d="M36 40 L60 78 L84 40" fill="none" stroke="url(#vmV)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse className="vm-eye" cx="48" cy="52" rx="4.2" ry="6" fill="#0b0716" />
          <ellipse className="vm-eye r" cx="72" cy="52" rx="4.2" ry="6" fill="#0b0716" />
          <circle cx="46.5" cy="49.5" r="1.3" fill="#fff" /><circle cx="70.5" cy="49.5" r="1.3" fill="#fff" />
          <ellipse cx="44" cy="34" rx="9" ry="5" fill="#fff" opacity=".18" transform="rotate(-25 44 34)" />
        </g>
      </svg>
    </div>
  );
}
