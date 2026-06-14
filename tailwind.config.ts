import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system tokens — see docs/CONTRIBUTING.md § Design system
        'page-bg': '#F5F5F7',
        'card-bg': '#FFFFFF',
        accent: '#0369A1',
        safe: '#059669',
      },
      fontFamily: {
        sans: ['General Sans', 'DM Sans', 'system-ui', 'sans-serif'],
        heading: ['Satoshi', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        control: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.05)',
      },
    },
  },
  plugins: [],
}

export default config
