import { describe, expect, it } from 'vitest';
import { paletteColors } from '../src/colors';
import { loadSettings, PALETTES, type PaletteName } from '../src/settings';
import { themeConfig } from '../src/theme';

// Independent WCAG relative-luminance calculation for theme color pairs.
function contrast(a: string, b: string): number {
  const luminance = (hex: string): number => [0.2126, 0.7152, 0.0722].reduce((sum, weight, i) => {
    const channel = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return sum + weight * (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  }, 0);
  const values = [luminance(a), luminance(b)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe('sequence number contrast', () => {
  for (const palette of Object.keys(PALETTES) as PaletteName[]) for (const dark of [false, true]) {
    it(`${palette} ${dark ? 'dark' : 'light'} keeps numbers readable without changing fills or message colors`, () => {
      const settings = loadSettings({ defaults: { palette } });
      const colors = paletteColors(settings.defaults, dark);
      const variables = themeConfig(settings.defaults, 'sequence', dark).themeVariables;
      expect(contrast(variables.sequenceNumberColor, variables.signalColor)).toBeGreaterThanOrEqual(4.5);
      expect(variables.signalColor).toBe(colors.line);
      expect(variables.signalTextColor).toBe(colors.text);
      expect(variables.actorBkg).toBe(colors.surface);
    });
  }

  it.each(['#111111', '#eeeeee', '#777777'])('adapts to a custom connector color %s', line => {
    const settings = loadSettings({ defaults: { colors: { light: { line } } } });
    const variables = themeConfig(settings.defaults, 'sequence', false).themeVariables;
    expect(contrast(variables.sequenceNumberColor, line)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses advanced signal colors and respects an explicit number color', () => {
    const settings = loadSettings({});
    const extra = { themeVariables: { signalColor: '#222222' } };
    expect(themeConfig(settings.defaults, 'sequence', false, extra).themeVariables.sequenceNumberColor).toBe('#ffffff');
    expect(themeConfig(settings.defaults, 'sequence', false, {
      themeVariables: { ...extra.themeVariables, sequenceNumberColor: '#ffcc00' },
    }).themeVariables.sequenceNumberColor).toBe('#ffcc00');
  });
});

describe('default palette hierarchy', () => {
  for (const palette of Object.keys(PALETTES) as PaletteName[]) for (const dark of [false, true]) {
    it(`${palette} ${dark ? 'dark' : 'light'} separates text, connectors, outlines and fills`, () => {
      const { defaults } = loadSettings({ defaults: { palette } });
      const c = paletteColors(defaults, dark);
      for (const fill of [c.background, c.surface, c.label]) expect(contrast(c.text, fill)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.border, c.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.line, c.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.text, c.background)).toBeGreaterThan(contrast(c.line, c.background));
      expect(contrast(c.line, c.background)).toBeGreaterThan(contrast(c.border, c.background));
    });
  }
});

describe('specialized diagram themes', () => {
  for (const palette of Object.keys(PALETTES) as PaletteName[]) for (const dark of [false, true]) {
    it(`${palette} ${dark ? 'dark' : 'light'} has visible chart series and legible labels`, () => {
      const { defaults } = loadSettings({ defaults: { palette } });
      const v = themeConfig(defaults, 'mindmap', dark).themeVariables;
      const colors = new Set<string>();
      for (let i = 0; i < 12; i++) {
        colors.add(v[`cScale${i}`]);
        expect(contrast(v[`cScale${i}`], v.background)).toBeGreaterThanOrEqual(3);
        expect(contrast(v[`cScaleLabel${i}`], v[`cScale${i}`])).toBeGreaterThanOrEqual(4.5);
      }
      expect(colors.size).toBe(12);
      expect(contrast(v.gitBranchLabel0, v.git0)).toBeGreaterThanOrEqual(4.5);
      for (const key of ['archGroupBorderColor', 'archEdgeColor']) expect(contrast(v[key], v.background)).toBeGreaterThanOrEqual(3);
      expect(contrast(v.packet.labelColor, v.packet.blockFillColor)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(v.treeView.labelColor, v.background)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('preserves individual and nested source colors without losing other defaults', () => {
    const { defaults } = loadSettings({});
    const v = themeConfig(defaults, 'radar', true, { themeVariables: {
      cScale0: '#123456', cScaleLabel0: '#fedcba', archGroupBorderColor: '#654321',
      radar: { curveOpacity: 0.37 }, packet: { blockFillColor: '#abcdef' }, wardley: { gridColor: '#123abc' },
    } }).themeVariables;
    expect(v.cScale0).toBe('#123456'); expect(v.cScaleLabel0).toBe('#fedcba');
    expect(v.archGroupBorderColor).toBe('#654321'); expect(v.radar.curveOpacity).toBe(0.37);
    expect(v.packet.blockFillColor).toBe('#abcdef'); expect(v.wardley.gridColor).toBe('#123abc');
    expect(v.packet.labelColor).toBe('#b3e4cb'); expect(v.wardley.componentLabelColor).toBe('#b3e4cb');
  });
});
