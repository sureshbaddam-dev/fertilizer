import React from 'react';
import vedixaLogoImg from '../../assets/vedixa_logo.webp';

export default function BrandLogo({
  className = '',
  imgClassName = '',
  style = {},
  isLcp = false,
}) {
  return (
    <div className={`flex items-center justify-center h-auto ${className}`}>
      <img
        src={vedixaLogoImg}
        alt="VEDIXA ERP Logo"
        width="192"
        height="96"
        loading="eager"
        fetchpriority={isLcp ? "high" : undefined}
        className={`block h-[96px] w-auto object-contain select-none ${imgClassName}`}
        style={style}
        draggable={false}
      />
    </div>
  );
}