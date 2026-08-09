/**
 * Centralized Master Agriculture ERP Design System & Theme Colors
 */

export const AGRI_THEME = {
  primary: {
    gradient: 'linear-gradient(180deg, #0A8A45 0%, #00783C 55%, #006E36 100%)',
    gradientHover: 'linear-gradient(180deg, #12944D 0%, #0A8A45 50%, #00783C 100%)',
    border: '#0B7A3D',
    text: '#FFFFFF',
    bg: '#00783C',
  },
  secondary: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#047857',
    hoverBg: '#D1FAE5',
  },
  categories: {
    Fertilizers: '#00783C',
    Seeds: '#F59E0B',
    Pesticides: '#8B5CF6',
    'Plant Growth': '#3B82F6',
    'Animal Feed': '#EAB308',
    Others: '#6B7280',
  },
  badges: {
    active: { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
    lowStock: { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706' },
    critical: { bg: '#FEE2E2', border: '#FECACA', text: '#DC2626' },
    outOfStock: { bg: '#FEE2E2', border: '#FECACA', text: '#DC2626' },
  },
};

export const getAgriCategoryColor = (categoryName = '') => {
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('fertilizer')) return '#00783C'; // Green
  if (cat.includes('seed')) return '#F59E0B'; // Orange
  if (cat.includes('pesticide')) return '#8B5CF6'; // Purple
  if (cat.includes('plant') || cat.includes('growth')) return '#3B82F6'; // Blue
  if (cat.includes('animal') || cat.includes('feed')) return '#EAB308'; // Yellow
  return '#6B7280'; // Gray
};
