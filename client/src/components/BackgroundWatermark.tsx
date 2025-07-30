import { useEffect, useState } from 'react';
import EunoLogo from './EunoLogo';

export default function BackgroundWatermark() {
  const [logoStyle, setLogoStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleScroll = () => {
      
      // Detect which section we're in based on scroll position
      const sections = document.querySelectorAll('section');
      let currentBgLight = true;
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check if this section is in the viewport center
        if (rect.top <= viewportHeight / 2 && rect.bottom >= viewportHeight / 2) {
          // Check background color of the section
          const bgColor = window.getComputedStyle(section).backgroundColor;
          const hasGrayBg = section.classList.contains('bg-gray-50') || 
                          section.classList.contains('bg-gray-100') ||
                          bgColor.includes('248, 250, 252'); // gray-50 rgb value
          
          currentBgLight = !hasGrayBg;
        }
      });
      
      // Adjust logo style based on background
      setLogoStyle({
        filter: currentBgLight 
          ? 'brightness(0) saturate(100%) invert(85%) sepia(5%) saturate(500%) hue-rotate(90deg) brightness(95%) contrast(90%)' // Lighter sage green for light backgrounds
          : 'brightness(0) saturate(100%) invert(48%) sepia(10%) saturate(1352%) hue-rotate(90deg) brightness(91%) contrast(85%)', // Darker sage green for dark backgrounds
        opacity: 0.30, // 30% opacity watermark
        transition: 'all 0.3s ease-in-out'
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  return (
    <>
      {/* Desktop watermark */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 hidden md:block overflow-hidden"
        aria-hidden="true"
      >
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: `translate(-50%, -50%)`,
          }}
        >
          <EunoLogo 
            className="w-[600px] h-[600px] lg:w-[800px] lg:h-[800px]" 
            style={logoStyle}
          />
        </div>
      </div>

      {/* Mobile watermark - smaller and positioned differently */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 md:hidden overflow-hidden"
        aria-hidden="true"
      >
        <div 
          className="absolute right-0 bottom-0"
          style={{
            transform: `translate(0, 0)`,
          }}
        >
          <EunoLogo 
            className="w-[300px] h-[300px] translate-x-1/3 translate-y-1/3" 
            style={logoStyle}
          />
        </div>
      </div>
    </>
  );
}