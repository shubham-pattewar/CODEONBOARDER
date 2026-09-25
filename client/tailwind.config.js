/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Brand palette
        primary: {
          DEFAULT: '#E35336',
          hover:   '#F06448',
          muted:   '#A0522D',
          subtle:  'rgba(227,83,54,0.10)',
        },
        secondary: {
          DEFAULT: '#F4A460',
          muted:   'rgba(244,164,96,0.15)',
        },
        ivory: {
          DEFAULT: '#F5F5DC',
          dim:     '#C9C3B5',
          muted:   '#918A80',
        },
        // Dark surfaces
        dark: {
          bg:       '#11100F',
          surface:  '#181614',
          elevated: '#211D1A',
          hover:    '#29231F',
        },
        // Light surfaces
        light: {
          bg:       '#F5F5DC',
          surface:  '#FFFDF7',
          elevated: '#FFFFFF',
        },
      },
      borderRadius: {
        sm:  '6px',
        DEFAULT: '8px',
        md:  '8px',
        lg:  '10px',
        xl:  '12px',
        '2xl': '16px',
      },
      spacing: {
        '1.5': '6px',
        '2':   '8px',
        '3':   '12px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '8':   '32px',
      },
      animation: {
        'fade-in-up':     'fadeInUp 0.4s ease both',
        'fade-in-down':   'fadeInDown 0.35s ease both',
        'scale-in':       'scaleIn 0.3s ease both',
        'slide-in-right': 'slideInRight 0.35s ease both',
        'slide-in-left':  'slideInLeft 0.35s ease both',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'shimmer':        'shimmer 1.8s linear infinite',
        'orb-drift':      'orbDrift 10s ease-in-out infinite',
        'progress-pulse': 'progressPulse 2s ease-in-out infinite',
        'step-pulse':     'stepPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(10px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        orbDrift: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '33%':  { transform: 'translate(25px, -18px) scale(1.04)' },
          '66%':  { transform: 'translate(-18px, 12px) scale(0.96)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        progressPulse: {
          '0%, 100%': { opacity: '0.8' },
          '50%':      { opacity: '1' },
        },
        stepPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(227,83,54,0.4)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(227,83,54,0)' },
        },
      },
    },
  },
  plugins: [],
}
