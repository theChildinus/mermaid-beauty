import { describe, expect, it } from 'vitest';
import { pngSize } from '../src/diagram-export';
import { loadSettings, hasRenderingChanges } from '../src/settings';

describe('portable image dimensions', () => {
  it('exports ordinary diagrams at 2x', () => {
    expect(pngSize(640, 480)).toEqual({ width: 1280, height: 960, scale: 2 });
  });
  it.each([[20_000, 800], [800, 20_000], [10_000, 10_000], [1, 100_000]])('bounds a %s by %s diagram for mobile canvases', (w, h) => {
    const size = pngSize(w, h);
    expect(size.width).toBeGreaterThan(0); expect(size.height).toBeGreaterThan(0);
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(4096);
    expect(size.width * size.height).toBeLessThanOrEqual(16_000_000);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid dimensions %s', value => {
    expect(() => pngSize(value, 100)).toThrow('Invalid diagram dimensions');
  });
});

describe('first-use guidance', () => {
  it('welcomes a new install while preserving the appearance of existing installations', () => {
    expect(loadSettings(null).welcomeSeen).toBe(false);
    expect(loadSettings({ defaults: { palette: 'rose' } })).toMatchObject({ welcomeSeen: true, defaults: { palette: 'rose', colorStyle: 'single' } });
    const first = loadSettings(null);
    const saved = loadSettings({ ...first, welcomeSeen: true });
    expect(saved.welcomeSeen).toBe(true);
    expect(saved.defaults.colorStyle).toBe('multi');
    expect(hasRenderingChanges(first, saved)).toBe(false);
  });
});
