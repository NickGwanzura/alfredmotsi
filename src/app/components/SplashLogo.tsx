'use client';

import React from 'react';

interface SplashLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function SplashLogo({ className, style }: SplashLogoProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" className={className} style={style}>
      <defs>
        <style>{`.cls-1{fill:#093a68;}.cls-2{fill:#0c4a82;}.cls-3{fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:35px;}.cls-4{fill:none;stroke:#fff;stroke-width:25px;}.cls-5{fill:#fff;}`}</style>
      </defs>
      <circle className="cls-1" cx="800" cy="450" r="480"/>
      <circle className="cls-2" cx="800" cy="450" r="460"/>
      <g className="cls-3">
        <line x1="800" y1="175" x2="800" y2="725"/>
        <line x1="175" y1="450" x2="1425" y2="450"/>
        <line x1="270" y1="270" x2="1330" y2="630"/>
        <line x1="1330" y1="270" x2="270" y2="630"/>
        <line x1="800" y1="240" x2="590" y2="410"/>
        <line x1="800" y1="240" x2="1010" y2="410"/>
        <line x1="800" y1="660" x2="590" y2="490"/>
        <line x1="800" y1="660" x2="1010" y2="490"/>
        <line x1="240" y1="450" x2="410" y2="590"/>
        <line x1="240" y1="450" x2="410" y2="310"/>
        <line x1="1360" y1="450" x2="1190" y2="590"/>
        <line x1="1360" y1="450" x2="1190" y2="310"/>
      </g>
      <circle className="cls-4" cx="800" cy="450" r="180"/>
      <circle className="cls-5" cx="800" cy="450" r="60"/>
    </svg>
  );
}
