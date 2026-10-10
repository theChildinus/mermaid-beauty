import { describe, expect, it } from 'vitest';
import { contrastRatio, paletteColors } from '../src/colors';
import { hasRenderingChanges, loadSettings, MULTICOLOR_PALETTES, PALETTES, resolveAppearance, type MulticolorPaletteName } from '../src/settings';
import { componentPalette } from '../src/component-theme';
import { seriesColors } from '../src/chart-theme';
import { themeConfig } from '../src/theme';

describe('color style settings', () => {
  it('uses coordinated colors for a new installation and keeps saved appearances unchanged', () => {
    expect(loadSettings(null).defaults.colorStyle).toBe('multi');
    expect(loadSettings(undefined).defaults.colorStyle).toBe('multi');
    expect(loadSettings({ defaults: { palette: 'sky' } }).defaults.colorStyle).toBe('single');
    expect(loadSettings({}).defaults.colorStyle).toBe('single');
  });
  it('inherits, overrides and persists the color style independently of the palette', () => {
    const settings = loadSettings({ defaults: { colorStyle: 'multi' }, types: {
      sequence: { mode: 'beauty', colorStyle: 'single' }, flowchart: { palette: 'rose' },
    } });
    const saved = loadSettings(JSON.parse(JSON.stringify(settings)));
    expect(resolveAppearance(saved, 'sequence').colorStyle).toBe('single');
    expect(resolveAppearance(saved, 'flowchart')).toMatchObject({ colorStyle: 'multi', palette: 'rose' });
    expect(resolveAppearance(saved, 'kanban').colorStyle).toBe('multi');
  });
  it('ignores invalid saved color styles', () => {
    const settings = loadSettings({ defaults: { colorStyle: 'random' }, types: { sequence: { colorStyle: 1 } } });
    expect(settings.defaults.colorStyle).toBe('single');
    expect(settings.types.sequence?.colorStyle).toBeUndefined();
  });
  it('keeps separate preset choices when switching styles and reloading', () => {
    const settings = loadSettings({ defaults: { colorStyle: 'multi', palette: 'sky', multiPalette: 'natural' },
      types: { sequence: { mode: 'beauty', palette: 'mint', multiPalette: 'cool' } } });
    settings.defaults.colorStyle = 'single';
    const saved = loadSettings(JSON.parse(JSON.stringify(settings)));
    expect(saved.defaults).toMatchObject({ palette: 'sky', multiPalette: 'natural', colorStyle: 'single' });
    expect(resolveAppearance(saved, 'sequence')).toMatchObject({ palette: 'mint', multiPalette: 'cool' });
    saved.defaults.colorStyle = 'multi';
    expect(paletteColors(saved.defaults, false).surface).toBe(paletteColors(loadSettings({ defaults: { colorStyle: 'multi', multiPalette: 'natural' } }).defaults, false).surface);
  });
  it('maps legacy multicolor choices without changing saved single-hue colors', () => {
    for (const [palette, multiPalette] of Object.entries({ sky: 'clear', mint: 'clear', slate: 'cool', rose: 'natural' })) {
      const settings = loadSettings({ defaults: { palette } });
      expect(settings.defaults).toMatchObject({ palette, multiPalette, colorStyle: 'single' });
    }
    expect(loadSettings({ defaults: { multiPalette: 'unknown' } }).defaults.multiPalette).toBe('clear');
  });
  it('does not redraw when only the inactive style preset changes', () => {
    const multi = loadSettings({ defaults: { colorStyle: 'multi', palette: 'sky', multiPalette: 'clear' } });
    expect(hasRenderingChanges(multi, loadSettings({ ...multi, defaults: { ...multi.defaults, palette: 'rose' } }))).toBe(false);
    const single = loadSettings({ defaults: { colorStyle: 'single', multiPalette: 'clear' } });
    expect(hasRenderingChanges(single, loadSettings({ ...single, defaults: { ...single.defaults, multiPalette: 'natural' } }))).toBe(false);
    expect(hasRenderingChanges(multi, loadSettings({ ...multi, defaults: { ...multi.defaults, multiPalette: 'natural' } }))).toBe(true);
  });
  it('uses a per-type multicolor preset instead of inherited custom colors', () => {
    const settings = loadSettings({ defaults: { colorStyle: 'multi', colors: { light: { surface: '#abcdef' } } },
      types: { sequence: { mode: 'beauty', multiPalette: 'natural', useCustomColors: false } } });
    expect(paletteColors(resolveAppearance(settings, 'sequence'), false).surface).toBe(paletteColors(loadSettings({ defaults: { colorStyle: 'multi', multiPalette: 'natural' } }).defaults, false).surface);
    expect(paletteColors(resolveAppearance(settings, 'flowchart'), false).surface).toBe('#abcdef');
  });
});

// Check the named color families, independently of exact token values or brightness.
function hue(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(red!, green!, blue!), min = Math.min(red!, green!, blue!), delta = max - min;
  if (delta === 0) return -1;
  const sector = max === red ? (green! - blue!) / delta : max === green ? (blue! - red!) / delta + 2 : (red! - green!) / delta + 4;
  return (sector * 60 + 360) % 360;
}

describe('complete multicolor presets', () => {
  for (const multiPalette of Object.keys(MULTICOLOR_PALETTES) as MulticolorPaletteName[]) for (const dark of [false, true]) {
    it(`${multiPalette} ${dark ? 'dark' : 'light'} keeps component text, borders and connectors clear`, () => {
      const { defaults } = loadSettings({ defaults: { colorStyle: 'multi', multiPalette } });
      const colors = paletteColors(defaults, dark), components = componentPalette(colors, dark);
      expect(components.fills).toHaveLength(6);
      components.fills.forEach((fill, index) => {
        expect(contrastRatio(colors.text, fill)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(components.borders[index]!, fill)).toBeGreaterThanOrEqual(3);
      });
      expect(contrastRatio(colors.line, colors.background)).toBeGreaterThanOrEqual(4.5);
      const series = seriesColors(colors, dark);
      expect(new Set(series).size).toBe(12);
      series.forEach(color => expect(contrastRatio(color, colors.background)).toBeGreaterThanOrEqual(3));
    });
  }
  for (const dark of [false, true]) {
    it(`keeps the three main families distinct in ${dark ? 'dark' : 'light'} mode`, () => {
      const families = {
        clear: [[200, 220], [155, 175], [35, 50]],
        cool: [[230, 250], [185, 205], [275, 295]],
        natural: [[85, 110], [35, 50], [15, 30]],
      };
      for (const multiPalette of Object.keys(families) as MulticolorPaletteName[]) {
        const colors = paletteColors(loadSettings({ defaults: { colorStyle: 'multi', multiPalette } }).defaults, dark);
        componentPalette(colors, dark).fills.slice(0, 3).forEach((fill, index) => {
          const [min, max] = families[multiPalette][index]!;
          expect(hue(fill)).toBeGreaterThanOrEqual(min!);
          expect(hue(fill)).toBeLessThanOrEqual(max!);
        });
      }
    });
  }
  it('changes the complete series rather than only its first color', () => {
    const series = Object.keys(MULTICOLOR_PALETTES).map(multiPalette => {
      const { defaults } = loadSettings({ defaults: { colorStyle: 'multi', multiPalette } });
      return seriesColors(paletteColors(defaults, false), false).slice(1).join(',');
    });
    expect(new Set(series).size).toBe(3);
  });
});

describe('coordinated component colors', () => {
  for (const palette of Object.keys(PALETTES)) for (const dark of [false, true]) {
    it(`${palette} ${dark ? 'dark' : 'light'} separates components with readable fills and outlines`, () => {
      const { defaults } = loadSettings({ defaults: { colorStyle: 'multi', palette } });
      const config = themeConfig(defaults, 'sequence', dark);
      const v = config.themeVariables;
      expect(config.theme).toBe(dark ? 'redux-dark-color' : 'redux-color');
      expect(new Set(v.bkgColorArray).size).toBeGreaterThanOrEqual(6);
      v.bkgColorArray.forEach((fill: string, index: number) => {
        expect(contrastRatio(v.actorTextColor, fill)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(v.borderColorArray[index], fill)).toBeGreaterThanOrEqual(3);
      });
      expect(new Set([v.actorBkg, v.activationBkgColor, v.noteBkgColor, v.clusterBkg]).size).toBe(4);
      expect(contrastRatio(v.noteTextColor, v.noteBkgColor)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(v.noteBorderColor, v.noteBkgColor)).toBeGreaterThanOrEqual(3);
      expect(config.look).toBe('classic');
      expect(config.sequence?.actorMargin).toBe(defaults.spacing);
    });
  }
  it('preserves authored component colors and native palette arrays', () => {
    const { defaults } = loadSettings({ defaults: { colorStyle: 'multi' } });
    const v = themeConfig(defaults, 'sequence', false, { themeVariables: {
      actorBkg: '#123456', actorBorder: '#abcdef', noteBkgColor: '#fedcba',
    } }).themeVariables;
    expect(new Set(v.bkgColorArray)).toEqual(new Set(['#123456']));
    expect(new Set(v.borderColorArray)).toEqual(new Set(['#abcdef']));
    expect(v.noteBkgColor).toBe('#fedcba');
    const flow = themeConfig(defaults, 'flowchart', false, { themeVariables: {
      primaryColor: '#123456', bkgColorArray: ['#abcdef', '#fedcba'],
    } }).themeVariables;
    expect(flow.bkgColorArray).toEqual(['#abcdef', '#fedcba']);
  });
  it('keeps custom fill and text controls authoritative in multicolor mode', () => {
    const { defaults } = loadSettings({ defaults: { colorStyle: 'multi', colors: {
      light: { surface: '#abcdef', text: '#123456', border: '#234567' },
    } } });
    const v = themeConfig(defaults, 'flowchart', false).themeVariables;
    expect(new Set(v.bkgColorArray)).toEqual(new Set(['#abcdef']));
    expect(new Set(v.borderColorArray)).toEqual(new Set(['#234567']));
    expect(v.primaryTextColor).toBe('#123456');
  });
});
