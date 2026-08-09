import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Aptos', 'Segoe UI', 'system-ui', 'sans-serif'],
      mono: ['Cascadia Code', 'IBM Plex Mono', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: ['0.875rem', { lineHeight: '1.25rem' }],
      sm: ['0.9375rem', { lineHeight: '1.5rem' }],
      base: ['1rem', { lineHeight: '1.625rem' }],
      lg: ['1.125rem', { lineHeight: '1.625rem' }],
      xl: ['1.375rem', { lineHeight: '1.875rem' }],
      '2xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '3xl': ['2.25rem', { lineHeight: '2.75rem' }],
    },
    extend: {
      colors: {
        agri: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          500: '#0A8A45',
          600: '#00783C',
          700: '#006E36',
          800: '#0B7A3D',
          900: '#047857',
        },
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#0A8A45',
          600: '#00783C',
          700: '#00783C',
          800: '#006E36',
          900: '#047857',
        },
        green: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#0A8A45',
          600: '#00783C',
          700: '#00783C',
          800: '#006E36',
          900: '#047857',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'calc(var(--radius-lg) + 0.25rem)',
        '2xl': 'calc(var(--radius-lg) + 0.5rem)',
      },
      boxShadow: {
        '2xs': 'var(--shadow-subtle)',
        xs: 'var(--shadow-card)',
        sm: '0 18px 40px rgba(15, 23, 42, 0.10)',
        lg: 'var(--shadow-overlay)',
      },
      spacing: {
        18: '4.5rem',
      },
      screens: {
        xs: '360px',
      },
      maxWidth: {
        app: 'var(--content-max-width)',
      },
      transitionDuration: {
        180: '180ms',
      },
    },
  },
  plugins: [],
};
