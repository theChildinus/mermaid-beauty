import type { Appearance, MulticolorPaletteName, PaletteName } from './settings';

export interface Colors {
  background: string; surface: string; label: string; text: string; border: string; line: string; accent: string;
  series?: readonly string[];
  componentFills?: readonly string[];
}
const LIGHT: Record<PaletteName, Colors> = {
  mint: { background: '#ffffff', surface: '#ddf3e7', label: '#effaf4', text: '#176b42', border: '#678f76', line: '#527560', accent: '#26845b' },
  slate: { background: '#ffffff', surface: '#edf0f5', label: '#f7f8fa', text: '#354158', border: '#7c899c', line: '#5f6f86', accent: '#536783' },
  sky: { background: '#ffffff', surface: '#e1effc', label: '#f1f7ff', text: '#225c95', border: '#638aab', line: '#4f7393', accent: '#367db9' },
  rose: { background: '#ffffff', surface: '#f8e5ed', label: '#fff4f8', text: '#934360', border: '#a9748b', line: '#885c70', accent: '#aa5375' },
};
const DARK: Record<PaletteName, Colors> = {
  mint: { background: '#171c1a', surface: '#203e32', label: '#1b2e26', text: '#b3e4cb', border: '#689e80', line: '#819c8d', accent: '#79cba1' },
  slate: { background: '#191c22', surface: '#2b3445', label: '#222936', text: '#d6dfef', border: '#8598b5', line: '#98a3b5', accent: '#abc0e2' },
  sky: { background: '#171d24', surface: '#233b53', label: '#1e2c3b', text: '#b9dcff', border: '#719bc2', line: '#8aa4bc', accent: '#86bfee' },
  rose: { background: '#21191d', surface: '#482d3b', label: '#33222b', text: '#f4cbdd', border: '#b9839c', line: '#b395a5', accent: '#e39eba' },
};
const MULTI: Record<MulticolorPaletteName, Record<'light' | 'dark', { fills: string[]; series: string[] }>> = {
  clear: {
    light: {
      fills: ['#dbeafe', '#ccfbf1', '#ede9fe', '#fef3c7', '#cffafe', '#fce7f3'],
      series: ['#2563eb', '#0f766e', '#7c3aed', '#b45309', '#0e7490', '#be185d', '#4338ca', '#15803d', '#a21caf', '#c2410c', '#0369a1', '#64748b'],
    },
    dark: {
      fills: ['#243a5b', '#1b403b', '#372b50', '#45381f', '#1b3c48', '#472b3d'],
      series: ['#7eb0ff', '#58c9b6', '#b89bed', '#e2b267', '#62c4de', '#eea0c1', '#9fafff', '#8cc79b', '#d2a0dd', '#e5ad8a', '#91c6e9', '#afbdcf'],
    },
  },
  cool: {
    light: {
      fills: ['#dbeafe', '#cffafe', '#ccfbf1', '#e0e7ff', '#d9edf1', '#e8edf3'],
      series: ['#2563eb', '#0e7490', '#0f766e', '#4f46e5', '#0b7285', '#52677e', '#1e40af', '#155e75', '#115e59', '#4338ca', '#075985', '#475569'],
    },
    dark: {
      fills: ['#243a5b', '#1b3c48', '#1b403b', '#2e3152', '#243d45', '#303846'],
      series: ['#7eb0ff', '#62c4de', '#58c9b6', '#9fafff', '#77bccb', '#afbdcf', '#a2bfff', '#8bbdce', '#8bbdb4', '#b7a9f2', '#8ecce9', '#cad3df'],
    },
  },
  natural: {
    light: {
      fills: ['#dfe8f0', '#e1ede4', '#ece4f2', '#f2e5d7', '#dfebed', '#f2e3e9'],
      series: ['#4b647e', '#49735f', '#766394', '#996735', '#526f79', '#8e576b', '#567342', '#865a4b', '#5d658f', '#7d6750', '#3f736c', '#80637e'],
    },
    dark: {
      fills: ['#2b3743', '#2b3a32', '#393044', '#42352b', '#293a3f', '#412d35'],
      series: ['#a6bfd6', '#abc7b6', '#c2afd6', '#d9b48d', '#abc4cb', '#d5acbb', '#b4c69a', '#d1b1a4', '#b7bfdd', '#d1bfa9', '#a7c8c1', '#c6adc3'],
    },
  },
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

/** WCAG contrast for opaque hex colors. Throws for unsupported color syntax. */
export function contrastRatio(first: string, second: string): number {
  const luminance = (value: string): number => {
    const hex = normalizeColor(value);
    if (!hex) throw new Error(`Expected an opaque hex color: ${value}`);
    const channels = [1, 3, 5].map(offset => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
  };
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Keep the theme text if readable; otherwise use the stronger black/white contrast. */
export function textOnFill(background: string, preferred: string): string {
  if (contrastRatio(background, preferred) >= 4.5) return preferred;
  return contrastRatio(background, '#000000') >= contrastRatio(background, '#ffffff') ? '#000000' : '#ffffff';
}

export function paletteColors(appearance: Appearance, dark: boolean): Colors {
  const custom = appearance.useCustomColors === false ? undefined : appearance.colors?.[dark ? 'dark' : 'light'];
  if (appearance.colorStyle === 'multi') {
    const colors = MULTI[appearance.multiPalette ?? 'clear'][dark ? 'dark' : 'light'];
    return { background: dark ? '#202124' : '#ffffff', surface: colors.fills[0]!, label: dark ? '#282e38' : '#f1f5f9',
      text: dark ? '#ecf0f6' : '#1f2937', border: colors.series[0]!, line: dark ? '#bac5d6' : '#475569',
      accent: colors.series[0]!, series: colors.series, componentFills: colors.fills, ...custom };
  }
  return { ...(dark ? DARK : LIGHT)[appearance.palette],
    ...custom };
}
