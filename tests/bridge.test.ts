import { describe, expect, it, vi } from 'vitest';
import { attachRenderer, type MermaidHost } from '../src/bridge';
import { loadSettings } from '../src/settings';

describe('Obsidian render bridge', () => {
  it('preserves arguments, falls back on failure, and restores the original renderer', async () => {
    const native = vi.fn(async () => ({ svg: '<svg>native</svg>', diagramType: 'sequence' }));
    const host: MermaidHost = { render: native };
    const beauty = vi.fn(async () => ({ svg: '<svg>beauty</svg>', diagramType: 'sequence' }));
    const report = vi.fn();
    const detach = attachRenderer(host, () => loadSettings({}), beauty, report);
    expect((await host.render('one', 'sequenceDiagram')).svg).toContain('beauty');
    beauty.mockRejectedValueOnce(new Error('failed'));
    expect((await host.render('two', 'sequenceDiagram')).svg).toContain('native');
    expect(native).toHaveBeenCalledWith('two', 'sequenceDiagram', undefined);
    expect(report).toHaveBeenCalledTimes(1);
    detach();
    expect(host.render).toBe(native);
  });
  it('honors native opt-outs without calling enhanced rendering', async () => {
    const host: MermaidHost = { render: vi.fn(async () => ({ svg: 'native', diagramType: 'sequence' })) };
    const beauty = vi.fn();
    attachRenderer(host, () => loadSettings({ types: { sequence: { mode: 'native' } } }), beauty, vi.fn());
    await host.render('x', 'sequenceDiagram');
    expect(beauty).not.toHaveBeenCalled();
  });
  it('does not overwrite a later plugin wrapper on unload', async () => {
    const host: MermaidHost = { render: vi.fn(async () => ({ svg: 'native', diagramType: 'flowchart' })) };
    const detach = attachRenderer(host, () => loadSettings({}), vi.fn(async () => ({ svg: 'beauty', diagramType: 'flowchart' })), vi.fn());
    const ours = host.render;
    const later = vi.fn(ours);
    host.render = later;
    detach();
    expect(host.render).toBe(later);
    expect((await host.render('x', 'graph LR; A-->B')).svg).toBe('native');
  });
  it('does not suppress errors from the native fallback', async () => {
    const host: MermaidHost = { render: vi.fn(async () => { throw new Error('invalid source'); }) };
    attachRenderer(host, () => loadSettings({}), vi.fn(async () => { throw new Error('enhancement failed'); }), vi.fn());
    await expect(host.render('x', 'invalid')).rejects.toThrow('invalid source');
  });
});
