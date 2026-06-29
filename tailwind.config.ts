import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        encre: '#0D0C0A',       // near-black — backgrounds, primary text
        parchemin: '#F7F3EC',   // warm off-white — page background
        or: '#B8860B',          // dark gold — accent, CTAs, highlights
        'or-light': '#D4A017',  // lighter gold for hover states
        sable: '#8C7B6B',       // warm gray — secondary text, labels
        ivoire: '#E8E0D4',      // warm border/divider
        // Status colors (muted, archival feel)
        vert: '#3B6B4A',        // confirmed / excellent
        rouge: '#7C2D2D',       // error / declined
        ambre: '#8B6914',       // pending / awaiting
        // Surface
        surface: '#FDFAF5',     // slightly warmer than white for cards
        'surface-raised': '#F0EBE2', // cards on parchemin bg
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        // Display scale (Cormorant reads large)
        'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-md': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-sm': ['1.25rem', { lineHeight: '1.3', letterSpacing: '0' }],
        // Body scale (Inter)
        'body-lg': ['1.0625rem', { lineHeight: '1.6' }],
        'body-md': ['0.9375rem', { lineHeight: '1.6' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5' }],
        // Utility / label (DM Mono)
        'label-lg': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0.04em' }],
        'label-sm': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(13,12,10,0.08), 0 1px 2px rgba(13,12,10,0.04)',
        'card-hover': '0 4px 12px rgba(13,12,10,0.12), 0 2px 4px rgba(13,12,10,0.06)',
        stamp: 'inset 0 0 0 1.5px currentColor',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
