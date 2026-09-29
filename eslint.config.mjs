import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
export default [
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'obsidianmd/ui/sentence-case': ['warn', { brands: ['Mermaid Beauty', 'Mermaid', 'Obsidian'], acronyms: ['ELK', 'JSON', 'SVG'] }],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/renderer.ts'],
    // This engine is shared with the real-browser harness, which has no Obsidian DOM extensions.
    rules: { 'obsidianmd/prefer-create-el': 'off' },
  },
  {
    files: ['src/settings-tab.ts'],
    // The declarative API requires Obsidian 1.13; keep compatibility with 1.12.7.
    rules: { 'obsidianmd/settings-tab/prefer-setting-definitions': 'off', '@typescript-eslint/no-deprecated': 'off' },
  },
];
