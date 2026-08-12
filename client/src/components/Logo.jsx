// Champ Words logo — crown tile + "C"/"W" tiles with 3D depth and glows
export default function Logo({ size = 120, className = '' }) {
  return (
    <svg className={className} width={size} height={Math.round(size * 0.9)}
      viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="Champ Words logo">
      <defs>
        <linearGradient id="cwTile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E3EAF8" />
        </linearGradient>
        <filter id="cwShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodColor="#050B1A" floodOpacity="0.45" />
        </filter>
        <filter id="cwGlowG" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="cwGlowA" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* glows behind the C / W tiles */}
      <ellipse cx="70" cy="148" rx="36" ry="28" fill="#fe2c55" opacity="0.38" filter="url(#cwGlowG)" />
      <ellipse cx="130" cy="148" rx="36" ry="28" fill="#25f4ee" opacity="0.38" filter="url(#cwGlowA)" />

      {/* motion swooshes */}
      <path d="M16 152 Q42 130 66 150" stroke="#fe2c55" strokeWidth="3" strokeLinecap="round" opacity="0.55" fill="none" />
      <path d="M184 152 Q158 130 134 150" stroke="#25f4ee" strokeWidth="3" strokeLinecap="round" opacity="0.55" fill="none" />

      {/* sparkles */}
      <path d="M22 92 L25 97 L30 100 L25 103 L22 108 L19 103 L14 100 L19 97 Z" fill="#fe2c55" opacity="0.9" />
      <path d="M178 92 L181 97 L186 100 L181 103 L178 108 L175 103 L170 100 L175 97 Z" fill="#25f4ee" opacity="0.9" />
      <circle cx="40" cy="60" r="2.6" fill="#FFFFFF" opacity="0.85" />
      <circle cx="163" cy="56" r="2.2" fill="#FFFFFF" opacity="0.7" />

      {/* crown tile (top) */}
      <g filter="url(#cwShadow)">
        <rect x="78" y="12" width="44" height="44" rx="11" fill="url(#cwTile)" />
        <path d="M86 46 L86 34 L92 39 L100 28 L108 39 L114 34 L114 46 Z"
          fill="#25f4ee" stroke="#0e9f9c" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="86" cy="33" r="2.8" fill="#25f4ee" />
        <circle cx="100" cy="27" r="2.8" fill="#25f4ee" />
        <circle cx="114" cy="33" r="2.8" fill="#25f4ee" />
      </g>

      {/* C tile (bottom-left) */}
      <g filter="url(#cwShadow)">
        <rect x="38" y="110" width="64" height="64" rx="15" fill="url(#cwTile)" />
        <text x="70" y="146" textAnchor="middle" dominantBaseline="central"
          fontFamily="'Arial Rounded MT Bold','Segoe UI',Arial,sans-serif" fontWeight="800"
          fontSize="32" fill="#0A1124">C</text>
      </g>

      {/* W tile (bottom-right) */}
      <g filter="url(#cwShadow)">
        <rect x="98" y="110" width="64" height="64" rx="15" fill="url(#cwTile)" />
        <text x="130" y="146" textAnchor="middle" dominantBaseline="central"
          fontFamily="'Arial Rounded MT Bold','Segoe UI',Arial,sans-serif" fontWeight="800"
          fontSize="30" fill="#0A1124">W</text>
      </g>
    </svg>
  );
}
