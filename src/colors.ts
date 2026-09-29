import type { Appearance, PaletteName } from './settings';

export interface Colors { background: string; surface: string; label: string; text: string; border: string; line: string; accent: string; }
const LIGHT: Record<PaletteName, Colors> = {
  mint: { background: '#ffffff', surface: '#ddf3e7', label: '#effaf4', text: '#176b42', border: '#afd7c1', line: '#8b9690', accent: '#26845b' },
  slate: { background: '#ffffff', surface: '#edf0f5', label: '#f7f8fa', text: '#354158', border: '#c1cbd8', line: '#8993a3', accent: '#536783' },
  sky: { background: '#ffffff', surface: '#e1effc', label: '#f1f7ff', text: '#225c95', border: '#b1cee9', line: '#869daf', accent: '#367db9' },
  rose: { background: '#ffffff', surface: '#f8e5ed', label: '#fff4f8', text: '#934360', border: '#dfb5c6', line: '#a5929a', accent: '#aa5375' },
};
const DARK: Record<PaletteName, Colors> = {
  mint: { background: '#171c1a', surface: '#203e32', label: '#1b2e26', text: '#b3e4cb', border: '#416b55', line: '#819c8d', accent: '#79cba1' },
  slate: { background: '#191c22', surface: '#2b3445', label: '#222936', text: '#d6dfef', border: '#526177', line: '#98a3b5', accent: '#abc0e2' },
  sky: { background: '#171d24', surface: '#233b53', label: '#1e2c3b', text: '#b9dcff', border: '#436c91', line: '#8aa4bc', accent: '#86bfee' },
  rose: { background: '#21191d', surface: '#482d3b', label: '#33222b', text: '#f4cbdd', border: '#80546a', line: '#b395a5', accent: '#e39eba' },
};
export const COLOR_FIELDS = {
  background: 'Background', surface: 'Node fill', label: 'Label fill', text: 'Text',
  border: 'Borders', line: 'Connectors', accent: 'Accent',
} as const;
export type ColorMode = 'light' | 'dark';
export type CustomColors = Partial<Record<ColorMode, Partial<Colors>>>;

/** Accept only literal hex colors; these values also enter generated SVG styles. */
export function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const hex = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex)) return '#' + [...hex.slice(1)].map(char => char + char).join('');
  return undefined;
}

export function paletteColors(appearance: Appearance, dark: boolean): Colors {
  return { ...(dark ? DARK : LIGHT)[appearance.palette], ...appearance.colors?.[dark ? 'dark' : 'light'] };
}
