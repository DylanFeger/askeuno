import eunoLogo from '@assets/783975A8-71CE-4C7A-ABF2-78280874D18D_1754584577565.png';

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