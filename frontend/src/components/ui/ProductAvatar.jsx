import React, { useState } from 'react';
import { getImageUrl } from '../../utils/imageUtils';

// Color palette for dynamic initial avatars based on product name
const AVATAR_COLORS = [
  'bg-emerald-600 text-white',
  'bg-teal-600 text-white',
  'bg-cyan-600 text-white',
  'bg-indigo-600 text-white',
  'bg-blue-600 text-white',
  'bg-emerald-700 text-white',
];

export default function ProductAvatar({
  src,
  name = 'Product',
  size = 60,
  className = '',
}) {
  const [imageError, setImageError] = useState(false);

  // Compute full image URL via central imageUtils
  const fullSrc = getImageUrl(src);

  // Extract initials (e.g., "Coragen 50ml" -> "CO", "Urea" -> "UR")
  const getInitials = (str) => {
    if (!str || typeof str !== 'string') return 'PR';
    const words = str.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  // Pick deterministic color based on name string sum
  const colorIndex = Math.abs(
    name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIndex];

  const sizeStyle = typeof size === 'number' ? {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
  } : {};

  const isHasValidSrc = Boolean(fullSrc && fullSrc.trim() && !imageError);

  if (isHasValidSrc) {
    return (
      <div
        style={sizeStyle}
        className={`rounded-lg overflow-hidden bg-white p-0.5 shrink-0 flex items-center justify-center ${className}`}
      >
        <img
          src={fullSrc}
          alt={name}
          loading="lazy"
          onError={() => setImageError(true)}
          className="w-full h-full object-contain rounded-md transition-opacity duration-200"
        />
      </div>
    );
  }

  // Fallback: Product Initial Avatar
  return (
    <div
      className={`rounded-lg overflow-hidden border border-emerald-200/70 font-semibold flex items-center justify-center tracking-wider shadow-2xs shrink-0 ${avatarColor} ${className}`}
      style={{
        ...sizeStyle,
        fontSize: size ? `${Math.max(11, Math.round(Number(size) * 0.32))}px` : '12px',
      }}
      title={name}
    >
      {initials}
    </div>
  );
}
