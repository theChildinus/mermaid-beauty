import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
export default [
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts', 'dev/**/*.ts'],
    rules: {
      'obsidianmd/ui/sentence-case': ['warn', { brands: ['Mermaid Beauty', 'Mermaid', 'Obsidian', 'README'], acronyms: ['ELK', 'JSON', 'SVG'] }],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/line-width.ts'],
    // This engine is shared with the real-browser harness, which has no Obsidian DOM extensions.
    rules: { 'obsidianmd/prefer-create-el': 'off' },
  },
];
