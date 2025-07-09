interface AcreLogoProps {
  className?: string;
}

export default function AcreLogo({ className = "w-8 h-8" }: AcreLogoProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="currentColor" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left lens */}
      <rect 
        x="10" 
        y="25" 
        width="35" 
        height="35" 
        rx="8" 
        ry="8" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="6"
      />
      
      {/* Right lens */}
      <rect 
        x="55" 
        y="25" 
        width="35" 
        height="35" 
        rx="8" 
        ry="8" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="6"
      />
      
      {/* Bridge */}
      <line 
        x1="45" 
        y1="42.5" 
        x2="55" 
        y2="42.5" 
        stroke="currentColor" 
        strokeWidth="6"
      />
      
      {/* Smile */}
      <path 
        d="M 30 70 Q 50 80 70 70" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}