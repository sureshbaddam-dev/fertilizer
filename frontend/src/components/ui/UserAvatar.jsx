import React, { useState, useEffect } from 'react';
import { normalizeImageUrl } from '../../utils/imageUtils';

export default function UserAvatar({
  src,
  name = 'User',
  size = 36,
  className = '',
  ring = true,
}) {
  const [hasError, setHasError] = useState(false);

  // Normalize image URL
  const normalizedSrc = normalizeImageUrl(src);

  // Reset error status if src changes
  useEffect(() => {
    setHasError(false);
  }, [normalizedSrc]);

  // Compute initials (e.g. "Baddam Suresh" -> "BS", "bsreddy" -> "B", "Rajkumar" -> "R")
  const getInitials = (text) => {
    if (!text || typeof text !== 'string') return 'U';
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    const single = parts[0] || 'U';
    return single.slice(0, single.length > 1 && /^[a-zA-Z]{2}/.test(single) ? 2 : 1).toUpperCase();
  };

  const initials = getInitials(name);
  const dimensionStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
  };

  const fontSizeStyle = {
    fontSize: `${Math.max(11, Math.round(size * 0.36))}px`,
  };

  const ringClass = ring ? 'border border-slate-200 shadow-2xs' : '';

  if (normalizedSrc && !hasError) {
    return (
      <div
        style={dimensionStyle}
        className={`relative rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center ${ringClass} ${className}`}
      >
        <img
          src={normalizedSrc}
          alt={name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
          loading="eager"
        />
      </div>
    );
  }

  // Fallback: Initials Avatar (Never shows a broken image icon)
  return (
    <div
      style={{ ...dimensionStyle, ...fontSizeStyle }}
      className={`rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center shrink-0 tracking-wider select-none ${ringClass} ${className}`}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
