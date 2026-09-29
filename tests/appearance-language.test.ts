import { describe, expect, it } from 'vitest';
import { resolveLanguage, translate } from '../src/i18n';
import { loadSettings, parseCustomConfig, resolveAppearance } from '../src/settings';
import { connectorWidthCss } from '../src/line-width';

describe('connector width settings', () => {
  it('preserves existing widths and appearance when migrating old settings', () => {
    const settings = loadSettings({ defaults: { palette: 'slate', fontSize: 16, radius: 11, spacing: 48 }, types: {} });
    expect(settings.defaults).toMatchObject({ lineWidth: 0, palette: 'slate', fontSize: 16, radius: 11, spacing: 48 });
    expect(connectorWidthCss('flowchart', settings.defaults.lineWidth)).toBe('');
  });
  it('inherits global widths and retains independent per-type overrides after reloading', () => {
    const saved = loadSettings({ defaults: { lineWidth: 2.4 }, types: { sequence: { mode: 'beauty', lineWidth: 0 }, class: { mode: 'beauty', lineWidth: 4 } } });
    const settings = loadSettings(JSON.parse(JSON.stringify(saved)));
    expect(resolveAppearance(settings, 'flowchart').lineWidth).toBe(2.4);
    expect(resolveAppearance(settings, 'sequence').lineWidth).toBe(0);
    expect(resolveAppearance(settings, 'class').lineWidth).toBe(4);
  });
  it.each([-1, 6.1, NaN, Infinity, '3', null])('rejects invalid saved widths: %s', lineWidth => {
    const settings = loadSettings({ defaults: { lineWidth }, types: { sequence: { lineWidth } } });
    expect(settings.defaults.lineWidth).toBe(0);
    expect(settings.types.sequence?.lineWidth).toBeUndefined();
  });
});

describe('interface language', () => {
  it('defaults to the host language and falls back to English for unsupported locales', () => {
    const settings = loadSettings({ language: 'unsupported' });
    expect(settings.language).toBe('auto');
    for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh_Hans']) expect(resolveLanguage('auto', locale)).toBe('zh');
    for (const locale of ['en', 'en-US', 'fr', '']) expect(resolveLanguage('auto', locale)).toBe('en');
    expect(resolveLanguage('en', 'zh')).toBe('en');
    expect(resolveLanguage('zh', 'en')).toBe('zh');
  });
  it.each(['auto', 'zh', 'en'])('persists the selected language: %s', language => {
    const settings = loadSettings({ language });
    expect(loadSettings(JSON.parse(JSON.stringify(settings))).language).toBe(language);
  });
  it('translates labels and validation errors without changing Mermaid configuration keys', () => {
    expect(translate('en', 'Line width')).toBe('Line width');
    expect(translate('zh', 'Line width')).toBe('连线粗细');
    expect(translate('zh', '{name} palette', { name: '天空蓝' })).toBe('天空蓝配色');
    expect(() => parseCustomConfig('{', 'zh')).toThrow('JSON 格式无效');
    expect(() => parseCustomConfig('{"securityLevel":"loose"}', 'zh')).toThrow('不支持配置项：securityLevel');
    expect(parseCustomConfig('{"sequence":{"actorMargin":80}}', 'zh')).toEqual({ sequence: { actorMargin: 80 } });
  });
});
