import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
export default [
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/browser/**/*.ts'],
    rules: {
      'obsidianmd/ui/sentence-case': ['warn', { brands: ['Mermaid Beauty', 'Mermaid', 'Obsidian', 'README'], acronyms: ['ELK', 'JSON', 'SVG'] }],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // These pages run in an ordinary browser, where Obsidian helpers do not
    // exist. Keep every other rule, including HTML sanitization and styling.
    files: ['tests/browser/**/*.ts'],
    rules: {
      'obsidianmd/prefer-create-el': 'off',
      'no-restricted-globals': ['warn',
        { name: 'app', message: 'The standalone preview must not depend on an Obsidian app instance.' },
        { name: 'localStorage', message: 'Keep preview checks isolated instead of persisting browser state.' },
      ],
    },
  },
];
