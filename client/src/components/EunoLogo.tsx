import eunoLogo from '@/assets/euno-logo.png';

interface EunoLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function EunoLogo({ className = "w-10 h-10", style }: EunoLogoProps) {
  return (
    <img 
      src={eunoLogo} 
      alt="Euno" 
      className={className}
      style={{ objectFit: 'contain', ...style }}
    />
  );
}