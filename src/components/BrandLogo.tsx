interface BrandLogoProps {
  className?: string;
}

/** Inline wordmark — avoids next/image SVG issues */
export function BrandLogo({ className = "h-14 w-auto md:h-16" }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 560 160"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TalentBridge — coordination, not resumes"
      className={className}
    >
      <defs>
        <linearGradient id="tbGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        <linearGradient id="tbLink" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="tbGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(20,20)" filter="url(#tbGlow)">
        <circle cx="22" cy="84" r="13" fill="none" stroke="url(#tbLink)" strokeWidth="5" />
        <circle cx="22" cy="84" r="4" fill="#22d3ee" />
        <circle cx="98" cy="40" r="13" fill="none" stroke="url(#tbLink)" strokeWidth="5" />
        <circle cx="98" cy="40" r="4" fill="#8b5cf6" />
        <path
          d="M22 84 L52 110 L98 40"
          fill="none"
          stroke="url(#tbGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <g transform="translate(150,0)">
        <text
          x="0"
          y="98"
          fontFamily="var(--font-display), Syne, Segoe UI, sans-serif"
          fontSize="52"
          fontWeight="700"
          letterSpacing="-1"
        >
          <tspan fill="url(#tbGrad)">Talent</tspan>
          <tspan fill="#e7eaf0">Bridge</tspan>
        </text>
        <text
          x="2"
          y="124"
          fontFamily="var(--font-body), DM Sans, Segoe UI, sans-serif"
          fontSize="14.5"
          fontWeight="500"
          letterSpacing="2.5"
          fill="#8b93a7"
        >
          COORDINATION · NOT RESUMES
        </text>
      </g>
    </svg>
  );
}
