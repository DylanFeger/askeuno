import hyppoLogo from '@/assets/hyppo-logo.png';

interface HyppoLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function HyppoLogo({ className = "w-10 h-10", style }: HyppoLogoProps) {
  return (
    <img 
      src={hyppoLogo} 
      alt="Hyppo" 
      className={className}
      style={{ objectFit: 'contain', ...style }}
    />
  );
}