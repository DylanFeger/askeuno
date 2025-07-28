interface GlassesIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function GlassesIcon({ className = "w-5 h-5", style }: GlassesIconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Square framed glasses */}
      <g>
        {/* Left lens */}
        <rect 
          x="2" 
          y="8" 
          width="8" 
          height="8" 
          rx="1" 
          stroke="currentColor" 
          strokeWidth="2"
          fill="none"
        />
        {/* Right lens */}
        <rect 
          x="14" 
          y="8" 
          width="8" 
          height="8" 
          rx="1" 
          stroke="currentColor" 
          strokeWidth="2"
          fill="none"
        />
        {/* Bridge */}
        <path 
          d="M10 12H14" 
          stroke="currentColor" 
          strokeWidth="2"
        />
        {/* Left temple */}
        <path 
          d="M2 12H1" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Right temple */}
        <path 
          d="M22 12H23" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}