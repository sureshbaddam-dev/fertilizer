import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';

// Curated professional palette for dynamic letter avatars
const AVATAR_PALETTES = [
  { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/90', font: 'text-[#047857]' },
  { bg: 'bg-teal-50 text-teal-800 border-teal-200/90', font: 'text-teal-700' },
  { bg: 'bg-blue-50 text-blue-800 border-blue-200/90', font: 'text-blue-700' },
  { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/90', font: 'text-indigo-700' },
  { bg: 'bg-amber-50 text-amber-900 border-amber-200/90', font: 'text-amber-800' },
  { bg: 'bg-violet-50 text-violet-800 border-violet-200/90', font: 'text-violet-700' },
  { bg: 'bg-cyan-50 text-cyan-800 border-cyan-200/90', font: 'text-cyan-700' },
  { bg: 'bg-rose-50 text-rose-800 border-rose-200/90', font: 'text-rose-700' },
];

/**
 * Extracts the single first uppercase alphanumeric letter from the product name.
 * Examples:
 * - "Nano Urea" -> "N"
 * - "Advanta ADV 768" -> "A"
 * - "Coragen" -> "C"
 */
export function getProductFirstLetter(str) {
  if (!str || typeof str !== 'string') return 'P';
  const trimmed = str.trim();
  if (!trimmed) return 'P';
  const match = trimmed.match(/[a-zA-Z0-9]/);
  return match ? match[0].toUpperCase() : trimmed[0].toUpperCase();
}

export default function ProductAvatar({
  src,
  name = 'Product',
  size,
  textSize,
  className = '',
  imgClassName = '',
}) {
  const [imageError, setImageError] = useState(false);

  // Compute full image URL via central imageUtils (returns '' for missing/default/urea_bag)
  const fullSrc = getImageUrl(src);

  const firstLetter = getProductFirstLetter(name);

  // Pick deterministic palette based on product name string character codes
  const nameStr = String(name || 'Product');
  const colorIndex = Math.abs(
    nameStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % AVATAR_PALETTES.length;
  const palette = AVATAR_PALETTES[colorIndex];

  const sizeStyle = typeof size === 'number' ? {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
  } : {};

  // Compute proportional large font size when numeric size is provided
  const dynamicFontSize = typeof size === 'number'
    ? `${Math.max(13, Math.round(size * 0.52))}px`
    : undefined;

  const isHasValidSrc = Boolean(fullSrc && fullSrc.trim() && !imageError);

  if (isHasValidSrc) {
    return (
      <div
        style={sizeStyle}
        className={`rounded-xl overflow-hidden bg-white p-0.5 shrink-0 flex items-center justify-center border border-gray-200/80 shadow-2xs ${className}`}
      >
        <img
          src={fullSrc}
          alt={name}
          loading="lazy"
          onError={() => setImageError(true)}
          className={`w-full h-full object-contain rounded-lg transition-opacity duration-200 ${imgClassName}`}
        />
      </div>
    );
  }

  // Fallback: Large, Clean, Attractive First-Letter Avatar Placeholder
  return (
    <div
      className={`rounded-xl overflow-hidden border font-black select-none flex items-center justify-center tracking-normal shadow-2xs shrink-0 ${palette.bg} ${className}`}
      style={{
        ...sizeStyle,
        fontSize: dynamicFontSize,
      }}
      title={name}
    >
      <span className={`leading-none flex items-center justify-center ${palette.font} ${textSize || ''}`}>
        {firstLetter}
      </span>
    </div>
  );
}
