import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, DIAGRAM_TYPES, diagramType, loadSettings, parseCustomConfig, resolveAppearance, shouldEnhance } from '../src/settings';
import { themeConfig } from '../src/theme';

describe('rendering choices', () => {
  it('enhances every known and future type by default', () => {
    for (const type of Object.keys(DIAGRAM_TYPES) as (keyof typeof DIAGRAM_TYPES)[]) expect(shouldEnhance(DEFAULT_SETTINGS, type)).toBe(true);
    expect(diagramType('futureDiagram\nA')).toBe('other');
  });
  it('recognizes declarations behind frontmatter, directives, and comments', () => {
    expect(diagramType('\uFEFF---\nconfig:\n  theme: dark\n---\n%%{init: {}}%%\n%% note\nsequenceDiagram\nA->>B: hi')).toBe('sequence');
    expect(diagramType('graph LR; A-->B')).toBe('flowchart');
    expect(diagramType('stateDiagram-v2\n[*] --> Ready')).toBe('state');
    expect(diagramType('C4Container\nContainer(a,"A")')).toBe('c4');
  });
  it('keeps a native opt-out local to one type', () => {
    const settings = loadSettings({ types: { sequence: { mode: 'native' } } });
    expect(shouldEnhance(settings, 'sequence')).toBe(false);
    expect(shouldEnhance(settings, 'flowchart')).toBe(true);
    settings.enabled = false;
    expect(shouldEnhance(settings, 'flowchart')).toBe(false);
  });
  it('bounds persisted values and inherits missing per-type settings', () => {
    const settings = loadSettings({ defaults: { fontSize: 1000, radius: 8 }, types: { sequence: { fontSize: 18, palette: 'sky' } } });
    expect(settings.defaults.fontSize).toBe(15);
    expect(resolveAppearance(settings, 'sequence')).toMatchObject({ fontSize: 18, radius: 8, palette: 'sky' });
  });
  it('never forces graph layout onto sequence, gantt, or mind maps', () => {
    for (const type of ['sequence', 'gantt', 'mindmap'] as const) expect(themeConfig(DEFAULT_SETTINGS.defaults, type, false).layout).toBeUndefined();
    expect(themeConfig(DEFAULT_SETTINGS.defaults, 'flowchart', false).layout).toBe('beauty-flowchart');
  });
});

describe('custom rendering options', () => {
  it('accepts appearance and diagram options', () => {
    const extra = parseCustomConfig('{"themeVariables":{"primaryColor":"#abcdef"},"sequence":{"actorMargin":90}}');
    const result = themeConfig(DEFAULT_SETTINGS.defaults, 'sequence', false, extra);
    expect(result.themeVariables.primaryColor).toBe('#abcdef');
    expect(result.sequence?.actorMargin).toBe(90);
    expect(result.sequence?.messageMargin).toBe(32);
    expect(result.securityLevel).toBe('strict');
  });
  it.each(['[]', '{"securityLevel":"loose"}', '{"themeVariables":{"__proto__":{}}}', '{"themeVariables":{"fontFamily":"url(https://example.com/font)"}}'])('rejects unsafe or invalid options: %s', value => {
    expect(() => parseCustomConfig(value)).toThrow();
  });
});

describe('custom palettes', () => {
  it('loads old presets without changing their colors', () => {
    const settings = loadSettings({ defaults: { palette: 'sky' } });
    expect(themeConfig(settings.defaults, 'flowchart', false).themeVariables.primaryColor).toBe('#e1effc');
    expect(themeConfig(settings.defaults, 'flowchart', true).themeVariables.primaryColor).toBe('#233b53');
  });
  it('persists valid light and dark colors and rejects unsafe values', () => {
    const settings = loadSettings({ defaults: { colors: {
      light: { surface: ' #ABC ', text: '#123456', line: 'red;stroke:url(x)', border: null, unknown: '#ffffff' },
      dark: { surface: '#aabbcc', accent: 'url(https://example.com)' },
    } } });
    expect(settings.defaults.colors).toEqual({ light: { surface: '#aabbcc', text: '#123456' }, dark: { surface: '#aabbcc' } });
    expect(loadSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });
  it('inherits colors per mode and per role without leaking type overrides', () => {
    const settings = loadSettings({ defaults: { colors: { light: { surface: '#abcdef', text: '#112233' }, dark: { line: '#ddeeff' } } },
      types: { sequence: { mode: 'beauty', colors: { light: { surface: '#fedcba' } } } } });
    const sequence = resolveAppearance(settings, 'sequence');
    expect(themeConfig(sequence, 'sequence', false).themeVariables).toMatchObject({ actorBkg: '#fedcba', actorTextColor: '#112233' });
    expect(themeConfig(sequence, 'sequence', true).themeVariables.actorLineColor).toBe('#ddeeff');
    expect(themeConfig(resolveAppearance(settings, 'flowchart'), 'flowchart', false).themeVariables.primaryColor).toBe('#abcdef');
    settings.defaults.colors!.light!.text = '#445566';
    expect(themeConfig(resolveAppearance(settings, 'sequence'), 'sequence', false).themeVariables.actorTextColor).toBe('#445566');
  });
  it('uses a selected per-type preset instead of global custom colors', () => {
    const settings = loadSettings({ defaults: { colors: { light: { surface: '#abcdef' } } }, types: { sequence: { palette: 'rose' } } });
    expect(themeConfig(resolveAppearance(settings, 'sequence'), 'sequence', false).themeVariables.actorBkg).toBe('#f8e5ed');
  });
  it('lets advanced Mermaid options override palette colors', () => {
    const settings = loadSettings({ defaults: { colors: { light: { surface: '#abcdef' } } } });
    expect(themeConfig(settings.defaults, 'sequence', false, { themeVariables: { actorBkg: '#fedcba' } }).themeVariables.actorBkg).toBe('#fedcba');
  });
});
