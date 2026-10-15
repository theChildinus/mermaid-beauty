import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App, PluginManifest } from 'obsidian';
import { loadSettings } from '../src/settings';

const host = vi.hoisted(() => ({
  write: vi.fn(), rerender: vi.fn(), updateOptions: vi.fn(), notice: vi.fn(), addCommand: vi.fn(),
  trigger: vi.fn(), processor: vi.fn(),
}));
vi.mock('../src/settings-tab', () => ({ BeautySettingTab: class {} }));
vi.mock('../src/export-controls', () => ({
  DiagramExportControls: class {
    private cleanups: (() => void)[] = [];
    register(cleanup: () => void): void { this.cleanups.push(cleanup); }
    unload = vi.fn(() => { for (const cleanup of this.cleanups) cleanup(); });
  },
  DiagramPicker: class {}, exportDiagram: vi.fn(),
}));
vi.mock('../src/file-export', () => ({ DiagramFileExport: class { dispose(): void {} } }));
vi.mock('../src/getting-started', () => ({ GettingStartedModal: class {} }));
vi.mock('obsidian', () => {
  class MarkdownView { previewMode = { rerender: host.rerender }; }
  return {
    getLanguage: () => 'en', loadMermaid: vi.fn(), Notice: host.notice, MarkdownView,
    Plugin: class {
      app = { workspace: { getLeavesOfType: () => [{ view: new MarkdownView() }], updateOptions: host.updateOptions, trigger: host.trigger,
        on: vi.fn(), onLayoutReady: vi.fn() } };
      saveData = host.write;
      loadData = vi.fn().mockResolvedValue({});
      addSettingTab = vi.fn();
      registerEvent = vi.fn();
      registerMarkdownPostProcessor = host.processor;
      addCommand = host.addCommand;
      removeCommand = vi.fn();
    },
  };
});
import MermaidBeautyPlugin from '../src/main';

describe('settings persistence and refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.stubGlobal('window', globalThis); vi.clearAllMocks();
    host.write.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  const plugin = (): MermaidBeautyPlugin => new MermaidBeautyPlugin({} as App, {} as PluginManifest);

  it('coalesces continuous changes into one write and one note refresh with the latest settings', async () => {
    const current = plugin();
    const first = current.save(loadSettings({ ...current.settings, defaults: { ...current.settings.defaults, fontSize: 16 } }));
    await vi.advanceTimersByTimeAsync(75);
    const second = current.save(loadSettings({ ...current.settings, defaults: { ...current.settings.defaults, fontSize: 20 } }));
    expect(current.settings.defaults.fontSize).toBe(20);
    expect(host.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(150); await Promise.all([first, second]);
    expect(host.write).toHaveBeenCalledTimes(1);
    expect(host.write.mock.calls[0]![0].defaults.fontSize).toBe(20);
    expect(host.rerender).not.toHaveBeenCalled();
    expect(host.trigger).toHaveBeenCalledTimes(1);
    expect(host.trigger).toHaveBeenCalledWith('post-processor-change');
    current.onunload();
  });
  it('observes only Mermaid sections, including native asynchronous placeholders', async () => {
    const current = plugin(); await current.onload();
    const process = host.processor.mock.calls[0]![0] as (element: unknown, context: unknown) => void;
    const context = { addChild: vi.fn(), sourcePath: 'Example.md' };
    process({ matches: () => false, querySelector: () => null }, context);
    expect(context.addChild).not.toHaveBeenCalled();
    process({ matches: () => false, querySelector: () => ({}) }, context);
    expect(context.addChild).toHaveBeenCalledTimes(1);
    current.onunload();
  });
  it('unloads controls in cached notes when the plugin stops and ignores late processors', async () => {
    const current = plugin(); await current.onload();
    const process = host.processor.mock.calls[0]![0] as (element: unknown, context: unknown) => void;
    const context = { addChild: vi.fn(), sourcePath: 'Example.md' };
    const element = { matches: () => true };
    process(element, context); process(element, context);
    const [closed, cached] = context.addChild.mock.calls.map(call => call[0] as { unload: () => void });
    closed!.unload(); // The Markdown host already disposed this section.
    current.onunload();
    expect(closed!.unload).toHaveBeenCalledTimes(1);
    expect(cached!.unload).toHaveBeenCalledTimes(1);
    process(element, context);
    expect(context.addChild).toHaveBeenCalledTimes(2);
  });
  it('persists UI language and inactive settings without redrawing notes', async () => {
    const current = plugin();
    await vi.advanceTimersByTimeAsync(0);
    const saved = current.save(loadSettings({ ...current.settings, language: 'zh', types: {
      flowchart: { mode: 'inherit', fontSize: 24, config: '{invalid' },
    } }));
    await vi.advanceTimersByTimeAsync(200); await saved;
    expect(host.write).toHaveBeenCalledTimes(1);
    expect(host.rerender).not.toHaveBeenCalled();
    expect(host.updateOptions).not.toHaveBeenCalled();
    expect(host.addCommand).toHaveBeenCalledWith(expect.objectContaining({ name: '刷新图表' }));
    current.onunload();
  });
  it('remembers the export folder without changing appearance or rerendering diagrams', async () => {
    const current = plugin();
    const appearance = structuredClone(current.settings.defaults);
    const saved = current.save({ ...current.settings, exportFolder: '/chosen/exports' });
    await vi.advanceTimersByTimeAsync(200); await saved;
    expect(host.write).toHaveBeenCalledWith(expect.objectContaining({ exportFolder: '/chosen/exports', defaults: appearance }));
    expect(host.trigger).not.toHaveBeenCalled();
    current.onunload();
  });
  it('flushes the latest pending settings on unload and ignores late UI callbacks', async () => {
    const current = plugin();
    const saved = current.save(loadSettings({ ...current.settings, defaults: { ...current.settings.defaults, fontSize: 21 } }));
    current.onunload(); await saved;
    expect(host.write).toHaveBeenCalledTimes(1);
    expect(host.write.mock.calls[0]![0].defaults.fontSize).toBe(21);
    await current.save(loadSettings({ defaults: { fontSize: 10 } }));
    await vi.runAllTimersAsync();
    expect(host.write).toHaveBeenCalledTimes(1);
  });
  it('serializes a later batch behind an in-flight write', async () => {
    const current = plugin();
    let finish!: () => void;
    host.write.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const first = current.save(loadSettings({ ...current.settings, defaults: { ...current.settings.defaults, fontSize: 16 } }));
    await vi.advanceTimersByTimeAsync(150);
    const second = current.save(loadSettings({ ...current.settings, defaults: { ...current.settings.defaults, fontSize: 23 } }));
    await vi.advanceTimersByTimeAsync(150);
    expect(host.write).toHaveBeenCalledTimes(1);
    finish(); await Promise.all([first, second]);
    expect(host.write).toHaveBeenCalledTimes(2);
    expect(host.write.mock.calls[1]![0].defaults.fontSize).toBe(23);
    current.onunload();
  });
  it('reports a failed save and allows the next batch to succeed', async () => {
    const current = plugin();
    host.write.mockRejectedValueOnce(new Error('Disk unavailable'));
    const first = current.save(loadSettings({ ...current.settings, language: 'zh' }));
    await vi.advanceTimersByTimeAsync(150); await first;
    expect(host.notice).toHaveBeenCalledTimes(1);
    const second = current.save(loadSettings({ ...current.settings, language: 'en' }));
    await vi.advanceTimersByTimeAsync(150); await second;
    expect(host.write).toHaveBeenCalledTimes(2);
    current.onunload();
  });
});
