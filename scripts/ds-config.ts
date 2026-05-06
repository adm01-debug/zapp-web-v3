export const DS_CONFIG = {
  WHITELIST: {
    colors: [
      'primary', 'primary-foreground',
      'secondary', 'secondary-foreground',
      'destructive', 'destructive-foreground',
      'muted', 'muted-foreground',
      'accent', 'accent-foreground',
      'popover', 'popover-foreground',
      'card', 'card-foreground',
      'background', 'foreground',
      'border', 'input', 'ring'
    ],
    fonts: ['sans', 'mono', 'serif'],
    spacing: ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32', '40', '48', '56', '64'],
  },
  VARIANTS: [
    'dark', 'hover', 'focus', 'active', 'disabled', 
    'peer-hover', 'peer-focus', 'peer-active', 'peer-disabled',
    'group-hover', 'group-focus', 'group-active', 'group-disabled',
    'focus-within', 'focus-visible'
  ],
  FORBIDDEN_PATTERNS: [
    { pattern: /(?:bg|text|border)-(?:\[(?:#(?:[0-9a-fA-F]{3,6})|rgb|hsl|rgba|hsla)\])\b/, label: 'Arbitrary Color' },
    { pattern: /(?:bg|text|border)-(?:white|black(?:(?!\-[0-9]))|(?:red|blue|green|yellow|slate|gray|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+)\b/, label: 'Literal Color' },
    { pattern: /font-(?:inter|sans|mono|serif)\b/, label: 'Literal Font' },
    { pattern: /(?<!\[)#([0-9a-fA-F]{3,6})\b/, label: 'Raw Hex' },
  ],
  IGNORE_DIRECTIVE: '@ds-ignore',
  IGNORED_FILES: [
    'DesignSystem.tsx',
    'tailwind.config.ts',
    'index.css',
    'check-design-system.ts',
    'ds-config.ts',
    'test-audit.ts',
    'check-design-system.test.ts'
  ],
  IGNORED_DIRS: ['node_modules', '.git', 'dist', 'stories', '__tests__', '.workspace']
};
