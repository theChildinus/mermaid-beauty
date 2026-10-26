import { describe, expect, it } from 'vitest';
import { naturalSvgWidth } from '../src/svg-size';

describe('SVG natural width', () => {
  it('preserves Mermaid pixel widths, including renderer-specific scaling', () => {
    expect(naturalSvgWidth('227.812px', 243)).toBe('227.812px');
  });
  it('falls back to a valid measured width', () => {
    expect(naturalSvgWidth('100%', 441.875)).toBe('441.875px');
    expect(naturalSvgWidth('', Number.NaN)).toBeUndefined();
  });
});
