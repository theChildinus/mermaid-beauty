import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import type { App } from 'obsidian';

const host = vi.hoisted(() => ({
  desktop: true, dialog: vi.fn(), write: vi.fn(), stat: vi.fn(), reveal: vi.fn(),
  read: vi.fn(), exists: vi.fn(), attachment: vi.fn(), createBinary: vi.fn(),
  png: vi.fn(), notice: vi.fn(), hide: vi.fn(), load: vi.fn(),
}));
vi.mock('obsidian', () => ({
  FileSystemAdapter: class {
    read = host.read; exists = host.exists;
    getFullPath(relative: string): string { return `/vault${relative ? '/' + relative : ''}`; }
  },
  Platform: { get isDesktopApp() { return host.desktop; } },
  normalizePath: (value: string) => value.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/'),
  Notice: class {
    constructor(content: unknown, duration: number) { host.notice(content, duration); }
    hide = host.hide;
  },
}));
vi.mock('../src/diagram-export', () => ({ diagramPng: host.png }));
import { FileSystemAdapter } from 'obsidian';
import { DiagramFileExport } from '../src/file-export';

class ElementStub {
  children: ElementStub[] = [];
  click?: () => void;
  constructor(public text = '', public tag = '') {}
  createDiv(options: { text?: string }): ElementStub { return this.createEl('div', options); }
  createEl(tag: string, options: { text?: string }): ElementStub {
    const child = new ElementStub(options.text, tag); this.children.push(child); return child;
  }
  addEventListener(_type: string, callback: () => void): void { this.click = callback; }
  get textContent(): string { return this.text + this.children.map(child => child.textContent).join('\n'); }
}

describe('file export destinations and feedback', () => {
  const image = { svg: '<svg><text>中文图表</text></svg>', width: 200, height: 100 };
  let files: DiagramFileExport, remembered: string | undefined;
  const remember = vi.fn(async (folder: string) => { remembered = folder; });
  beforeEach(() => {
    vi.resetAllMocks(); host.desktop = true; remembered = undefined;
    host.dialog.mockResolvedValue({ canceled: false, filePath: '/exports/选择的图表.svg' });
    host.write.mockResolvedValue(undefined);
    host.stat.mockResolvedValue({ isDirectory: () => true });
    host.exists.mockResolvedValue(true);
    host.read.mockResolvedValue('{"attachmentFolderPath":"./"}');
    host.attachment.mockResolvedValue('attachments/Example-diagram.svg');
    host.createBinary.mockResolvedValue(undefined);
    host.png.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    host.load.mockImplementation((name: string) => ({
      electron: { remote: { dialog: { showSaveDialog: host.dialog }, shell: { showItemInFolder: host.reveal } } },
      'fs/promises': { writeFile: host.write, stat: host.stat }, path,
    })[name]);
    vi.stubGlobal('window', { require: host.load });
    vi.stubGlobal('createFragment', () => new ElementStub());
    vi.stubGlobal('createEl', () => ({}));
    const app = { vault: { adapter: new FileSystemAdapter(), configDir: '.custom-obsidian', createBinary: host.createBinary },
      fileManager: { getAvailablePathForAttachment: host.attachment } } as unknown as App;
    files = new DiagramFileExport(app, (text, values) => text.replace(/\{(\w+)\}/g, (_, key: string) => values?.[key] ?? ''), () => remembered, remember);
  });
  afterEach(() => { files.dispose(); vi.unstubAllGlobals(); });

  it.each([
    ['./', '/vault/notes/Example-diagram.svg'], ['.', '/vault/notes/Example-diagram.svg'],
    ['./images', '/vault/notes/images/Example-diagram.svg'], ['assets', '/vault/assets/Example-diagram.svg'],
    ['', '/vault/Example-diagram.svg'],
  ])('starts in attachment location %s without invoking the folder-creating host API', async (folder, defaultPath) => {
    host.read.mockResolvedValue(JSON.stringify({ attachmentFolderPath: folder }));
    await files.save(image, 'svg', 'notes/Example.md');
    expect(host.read).toHaveBeenCalledWith('.custom-obsidian/app.json');
    expect(host.dialog).toHaveBeenCalledWith(expect.objectContaining({ defaultPath,
      filters: [{ name: 'SVG', extensions: ['svg'] }], properties: ['createDirectory', 'showOverwriteConfirmation'] }));
    expect(host.attachment).not.toHaveBeenCalled(); expect(host.createBinary).not.toHaveBeenCalled();
  });
  it('writes the exact selected vector file, remembers its folder and reveals that file from the notice', async () => {
    await files.save(image, 'svg', 'notes/Example.md');
    expect(host.write).toHaveBeenCalledWith('/exports/选择的图表.svg', new TextEncoder().encode(image.svg));
    expect(host.png).not.toHaveBeenCalled(); expect(remember).toHaveBeenCalledWith('/exports');
    const content = host.notice.mock.calls[0]![0] as ElementStub;
    expect(content.textContent).toContain('Exported 选择的图表.svg');
    expect(content.textContent).toContain('/exports');
    content.children[0]!.children.find(child => child.tag === 'button')!.click!();
    expect(host.reveal).toHaveBeenCalledWith('/exports/选择的图表.svg');
    expect(host.hide).toHaveBeenCalled();
  });
  it('uses the last successful folder across both formats and preserves the selected filename', async () => {
    await files.save(image, 'svg', 'notes/Example.md');
    host.dialog.mockResolvedValue({ canceled: false, filePath: '/exports/Custom.png' });
    await files.save(image, 'png', 'notes/Another.md');
    expect(host.dialog).toHaveBeenLastCalledWith(expect.objectContaining({ defaultPath: '/exports/Another-diagram.png', filters: [{ name: 'PNG', extensions: ['png'] }] }));
    expect(host.write).toHaveBeenLastCalledWith('/exports/Custom.png', new TextEncoder().encode('png'));
  });
  it.each(['ENOENT', 'ENOTDIR', 'EACCES'])('falls back to attachments for an unavailable remembered folder (%s)', async code => {
    remembered = '/other-device/exports'; host.stat.mockRejectedValue(Object.assign(new Error('unavailable'), { code }));
    await files.save(image, 'svg', 'notes/Example.md');
    expect(host.dialog).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: '/vault/notes/Example-diagram.svg' }));
  });
  it('cancels without encoding, writing, changing preferences, or claiming success', async () => {
    host.dialog.mockResolvedValue({ canceled: true });
    await files.save(image, 'png', 'notes/Example.md');
    expect(host.png).not.toHaveBeenCalled(); expect(host.write).not.toHaveBeenCalled();
    expect(remember).not.toHaveBeenCalled(); expect(host.notice).not.toHaveBeenCalled();
  });
  it('does not claim success or remember the directory after a write failure', async () => {
    host.write.mockRejectedValue(new Error('disk full'));
    await expect(files.save(image, 'svg', 'Example.md')).rejects.toThrow('disk full');
    expect(remember).not.toHaveBeenCalled(); expect(host.notice).not.toHaveBeenCalled();
  });
  it('does not silently save to the vault if the desktop dialog is unavailable', async () => {
    vi.stubGlobal('window', {});
    await expect(files.save(image, 'svg', 'Example.md')).rejects.toThrow('Save dialog is unavailable.');
    expect(host.createBinary).not.toHaveBeenCalled(); expect(host.write).not.toHaveBeenCalled();
  });
  it('does not write if the plugin unloads while the native dialog is open', async () => {
    let select!: (value: { canceled: boolean; filePath: string }) => void;
    host.dialog.mockReturnValue(new Promise(resolve => { select = resolve; }));
    const task = files.save(image, 'svg', 'Example.md');
    await vi.waitFor(() => expect(host.dialog).toHaveBeenCalled());
    files.dispose(); select({ canceled: false, filePath: '/exports/late.svg' }); await task;
    expect(host.write).not.toHaveBeenCalled(); expect(remember).not.toHaveBeenCalled();
  });
  it('does not open a second dialog while an export is pending', async () => {
    let cancel!: (value: { canceled: boolean }) => void;
    host.dialog.mockReturnValue(new Promise(resolve => { cancel = resolve; }));
    const task = files.save(image, 'svg', 'Example.md');
    await vi.waitFor(() => expect(host.dialog).toHaveBeenCalled());
    await files.save(image, 'png', 'Example.md');
    expect(host.dialog).toHaveBeenCalledTimes(1);
    cancel({ canceled: true }); await task;
  });
  it('keeps the mobile attachment fallback without loading desktop modules', async () => {
    host.desktop = false;
    await files.save(image, 'svg', 'notes/Example.md');
    expect(host.attachment).toHaveBeenCalledWith('Example-diagram.svg', 'notes/Example.md');
    expect(host.createBinary).toHaveBeenCalledWith('attachments/Example-diagram.svg', expect.any(ArrayBuffer));
    expect(host.load).not.toHaveBeenCalled(); expect(host.dialog).not.toHaveBeenCalled();
    expect(host.notice).toHaveBeenCalledWith('Diagram saved: attachments/Example-diagram.svg', 12_000);
  });
});
