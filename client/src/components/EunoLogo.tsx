interface EunoLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function EunoLogo({ className = "w-10 h-10", style }: EunoLogoProps) {
  return (
    <div 
      className={`${className} flex items-center justify-center`}
      style={style}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        aria-label="Euno Logo"
      >
        <circle cx="50" cy="50" r="45" fill="hsl(142, 25%, 45%)" />
        <text 
          x="50" 
          y="50" 
          textAnchor="middle" 
          dominantBaseline="central" 
          fill="white" 
          fontSize="40" 
          fontWeight="bold"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          E
        </text>
      </svg>
    </div>
  );
}