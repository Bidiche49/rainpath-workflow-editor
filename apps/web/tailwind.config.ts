import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Tailwind theme for the workflow editor.
 *
 * The `channel`, `status` and `exec` palettes are the project's semantic design
 * tokens (B-00). They are consumed exclusively through the static helpers in
 * `src/lib/design-tokens.ts` (and directly in B-02 / Phase 2 components), never
 * via runtime string templating — that keeps every class purge-safe.
 *
 * shadcn primitive vars (--primary, --background, --card…) are left untouched on
 * purpose: these palettes sit alongside them, they do not replace them.
 */
const config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
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
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Per-node-type palette. Keyed by the 8 NodeType values so the canvas,
        // sidebar and custom nodes share one source of truth for channel colors.
        channel: {
          start: { 50: '#f0fdf4', 100: '#dcfce7', 400: '#4ade80', 500: '#22c55e', 700: '#15803d' },
          email: { 50: '#eff6ff', 100: '#dbeafe', 400: '#60a5fa', 500: '#3b82f6', 700: '#1d4ed8' },
          sms: { 50: '#f0f9ff', 100: '#e0f2fe', 400: '#38bdf8', 500: '#0ea5e9', 700: '#0369a1' },
          whatsapp: {
            50: '#ecfdf5',
            100: '#d1fae5',
            400: '#34d399',
            500: '#10b981',
            700: '#047857',
          },
          letter: { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 700: '#b45309' },
          wait: { 50: '#f8fafc', 100: '#f1f5f9', 400: '#94a3b8', 500: '#64748b', 700: '#334155' },
          condition: {
            50: '#f5f3ff',
            100: '#ede9fe',
            400: '#a78bfa',
            500: '#8b5cf6',
            700: '#6d28d9',
          },
          end: { 50: '#f9fafb', 100: '#f3f4f6', 400: '#9ca3af', 500: '#6b7280', 700: '#374151' },
        },

        // Action-log lifecycle colours (presentation layer — see design-tokens.ts
        // for the divergence with the persisted ActionStatus enum).
        status: {
          sent: '#64748b', // slate-500
          delivered: '#3b82f6', // blue-500
          opened: '#10b981', // emerald-500
          rejected: '#ef4444', // red-500
          scheduled: '#f59e0b', // amber-500
        },

        // Node runtime highlight ring states for the read-only patient preview.
        exec: {
          idle: '#cbd5e1', // slate-300
          pending: '#3b82f6', // blue-500
          done: '#22c55e', // green-500
          blocked: '#ef4444', // red-500
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config;

export default config;
