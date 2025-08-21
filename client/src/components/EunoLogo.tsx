import eunoLogo from '@assets/783975A8-71CE-4C7A-ABF2-78280874D18D_1754584577565.png';

interface EunoLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function EunoLogo({ className = "w-10 h-10", style }: EunoLogoProps) {
  return (
    <div 
      className={`${className} bg-white rounded-lg overflow-hidden flex items-center justify-center`}
      style={style}
    >
      <img 
        src={eunoLogo} 
        alt="Euno" 
        className="w-full h-full"
        style={{ 
          objectFit: 'contain',
          // CSS filters to neutralize the beige background and make it appear white
          // Increase brightness and reduce saturation to turn beige to white
          filter: 'brightness(1.15) saturate(0.85) contrast(1.1)',
          // Mix blend mode to help blend with white background
          mixBlendMode: 'multiply' as any
        }}
      />
    </div>
  );
}