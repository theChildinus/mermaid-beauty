import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';

const host = vi.hoisted(() => ({ notice: vi.fn(), snapshot: vi.fn(), png: vi.fn() }));
vi.mock('obsidian', () => ({
  Notice: host.notice, MarkdownRenderChild: class {}, Menu: class {}, SuggestModal: class {}, setIcon: vi.fn(), FileSystemAdapter: class {}, Platform: { isDesktopApp: false }, normalizePath: (path: string) => path,
}));
vi.mock('../src/diagram-export', () => ({ diagramImage: host.snapshot, diagramPng: host.png }));
import { exportDiagram } from '../src/export-controls';
import { SvgClipboard } from '../src/svg-clipboard';
import { DiagramFileExport } from '../src/file-export';

describe('export actions', () => {
  const attachment = vi.fn(), createBinary = vi.fn(), clipboard = vi.fn(), clipboardText = vi.fn();
  const app = { fileManager: { getAvailablePathForAttachment: attachment }, vault: { createBinary } } as unknown as App;
  const svg = { ownerDocument: { defaultView: { navigator: { clipboard: { write: clipboard, writeText: clipboardText } } } } } as unknown as SVGSVGElement;
  const t = (text: string, values?: Record<string, string>): string => text.replace('{path}', values?.path ?? '');
  let svgClipboard: SvgClipboard;
  let files: DiagramFileExport;
  beforeEach(() => {
    svgClipboard = new SvgClipboard(app, t);
    files = new DiagramFileExport(app, t, () => undefined, async () => {});
    vi.clearAllMocks();
    vi.stubGlobal('createEl', () => ({}));
    vi.stubGlobal('ClipboardItem', class { constructor(public data: Record<string, Blob | Promise<Blob>>) {} });
    host.snapshot.mockReset().mockReturnValue({ svg: '<svg/>', width: 100, height: 100 });
    host.png.mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    attachment.mockReset().mockResolvedValue('attachments/Note-diagram 1.png');
    createBinary.mockReset().mockResolvedValue(undefined);
    clipboard.mockReset().mockResolvedValue(undefined);
    clipboardText.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('saves the PNG at the host-provided attachment path without editing the note', async () => {
    await exportDiagram(svg, 'png', 'notes/Note.md', t, svgClipboard, files);
    expect(attachment).toHaveBeenCalledWith('Note-diagram.png', 'notes/Note.md');
    expect(createBinary).toHaveBeenCalledWith('attachments/Note-diagram 1.png', expect.any(ArrayBuffer));
    expect(new TextDecoder().decode(createBinary.mock.calls[0]![1])).toBe('png');
    expect(host.notice).toHaveBeenCalledWith('Diagram saved: attachments/Note-diagram 1.png', 12_000);
  });
  it('saves a portable SVG without rasterizing it', async () => {
    await exportDiagram(svg, 'svg', 'notes/A:B.md', t, svgClipboard, files);
    expect(attachment).toHaveBeenCalledWith('A-B-diagram.svg', 'notes/A:B.md');
    expect(host.png).not.toHaveBeenCalled();
    expect(new TextDecoder().decode(createBinary.mock.calls[0]![1])).toBe('<svg/>');
  });
  it('starts clipboard writing during the gesture, before PNG encoding finishes', async () => {
    let finish!: (value: Blob) => void;
    host.png.mockReturnValue(new Promise<Blob>(resolve => { finish = resolve; }));
    clipboard.mockImplementation(async (items: { data: Record<string, Promise<Blob>> }[]) => { await items[0]!.data['image/png']; });
    const task = exportDiagram(svg, 'copy', 'Note.md', t, svgClipboard, files);
    expect(clipboard).toHaveBeenCalledTimes(1);
    expect(host.notice).not.toHaveBeenCalled();
    finish(new Blob(['png'], { type: 'image/png' })); await task;
    expect(host.notice).toHaveBeenCalledWith('Diagram copied as PNG.');
    expect(createBinary).not.toHaveBeenCalled();
  });
  it('suggests saving when clipboard permission is denied', async () => {
    clipboard.mockRejectedValue(new Error('NotAllowedError'));
    await exportDiagram(svg, 'copy', 'Note.md', t, svgClipboard, files);
    expect(host.notice).toHaveBeenCalledWith('Could not copy the image. Try saving it as PNG instead.');
    expect(createBinary).not.toHaveBeenCalled();
  });
  it('copies a vector image MIME without text, rasterization, or a vault file', async () => {
    const content = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text fill="#123456">中文图表</text></svg>';
    host.snapshot.mockReturnValue({ svg: content, width: 100, height: 100 });
    await exportDiagram(svg, 'copy-svg', 'notes/Note.md', t, svgClipboard, files);
    expect(clipboard).toHaveBeenCalledTimes(1);
    const items = clipboard.mock.calls[0]![0] as { data: Record<string, Blob> }[];
    expect(items).toHaveLength(1);
    expect(Object.keys(items[0]!.data)).toEqual(['image/svg+xml', 'text/html']);
    const image = items[0]!.data['image/svg+xml']!;
    expect(image.type).toBe('image/svg+xml');
    expect(await image.text()).toBe(content);
    const html = await items[0]!.data['text/html']!.text();
    expect(html).toContain('data-mermaid-beauty-svg=');
    expect(html).toContain(encodeURIComponent(content));
    expect(clipboardText).not.toHaveBeenCalled();
    expect(host.png).not.toHaveBeenCalled();
    expect(attachment).not.toHaveBeenCalled(); expect(createBinary).not.toHaveBeenCalled();
    expect(host.notice).toHaveBeenCalledWith('SVG copied. Paste into an app that supports SVG, or export the SVG file.', 8000);
  });
  it('reports failed SVG copying with an SVG save suggestion', async () => {
    clipboard.mockRejectedValue(new Error('NotAllowedError'));
    await exportDiagram(svg, 'copy-svg', 'Note.md', t, svgClipboard, files);
    expect(host.notice).toHaveBeenCalledTimes(1);
    expect(host.notice).toHaveBeenCalledWith('Could not copy the SVG. Try saving it as SVG instead.');
    expect(clipboardText).not.toHaveBeenCalled();
    expect(createBinary).not.toHaveBeenCalled();
  });
  it('shows the SVG compatibility hint only on the first successful copy per plugin session', async () => {
    await exportDiagram(svg, 'copy-svg', 'Note.md', t, svgClipboard, files);
    await exportDiagram(svg, 'copy-svg', 'Note.md', t, svgClipboard, files);
    expect(host.notice).toHaveBeenNthCalledWith(1, 'SVG copied. Paste into an app that supports SVG, or export the SVG file.', 8000);
    expect(host.notice).toHaveBeenNthCalledWith(2, 'Diagram copied as SVG.', 4000);
  });
  it('reports an unavailable SVG clipboard without claiming success', async () => {
    const unavailable = { ownerDocument: { defaultView: { navigator: {} } } } as unknown as SVGSVGElement;
    await exportDiagram(unavailable, 'copy-svg', 'Note.md', t, svgClipboard, files);
    expect(host.notice).toHaveBeenCalledTimes(1);
    expect(host.notice).toHaveBeenCalledWith('This device cannot copy SVG images. Save the SVG file and import it instead.');
    expect(clipboardText).not.toHaveBeenCalled();
  });
  it.each(['missing', 'unsupported'] as const)('reports %s SVG image support without copying source or PNG', async support => {
    vi.stubGlobal('ClipboardItem', support === 'missing' ? undefined : class { static supports(): boolean { return false; } });
    await exportDiagram(svg, 'copy-svg', 'Note.md', t, svgClipboard, files);
    expect(host.notice).toHaveBeenCalledWith('This device cannot copy SVG images. Save the SVG file and import it instead.');
    expect(clipboard).not.toHaveBeenCalled(); expect(clipboardText).not.toHaveBeenCalled();
    expect(host.png).not.toHaveBeenCalled(); expect(createBinary).not.toHaveBeenCalled();
  });
  it('reports failed storage without claiming success', async () => {
    createBinary.mockRejectedValue(new Error('Storage full'));
    await exportDiagram(svg, 'svg', 'Note.md', t, svgClipboard, files);
    expect(host.notice).toHaveBeenCalledTimes(1);
    expect(host.notice).toHaveBeenCalledWith('Could not save the diagram. Check available storage and try again.');
  });
  it.each(['svg', 'copy-svg'] as const)('rejects external images before a %s write', async action => {
    host.snapshot.mockImplementation(() => { throw new Error('External image resources cannot be exported.'); });
    await exportDiagram(svg, action, 'Note.md', t, svgClipboard, files);
    expect(clipboard).not.toHaveBeenCalled(); expect(clipboardText).not.toHaveBeenCalled(); expect(createBinary).not.toHaveBeenCalled();
    expect(host.notice).toHaveBeenCalledWith('This diagram contains external images. Use local embedded images before exporting.');
  });
});
