import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App, Editor, MarkdownFileInfo } from 'obsidian';

const notice = vi.hoisted(() => vi.fn());
vi.mock('obsidian', () => ({ Notice: notice }));
import { SvgClipboard } from '../src/svg-clipboard';

describe('SVG paste into Obsidian', () => {
  const image = { svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>中文矢量</text></svg>', width: 100, height: 100 };
  const write = vi.fn(), path = vi.fn(), create = vi.fn(), link = vi.fn(), replace = vi.fn();
  const value = vi.fn(), cursor = vi.fn();
  const app = { fileManager: { getAvailablePathForAttachment: path, generateMarkdownLink: link }, vault: { createBinary: create } } as unknown as App;
  const editor = { getValue: value, getCursor: cursor, replaceSelection: replace } as unknown as Editor;
  const t = (text: string, values?: Record<string, string>): string => text.replace('{path}', values?.path ?? '');
  let clipboard: SvgClipboard;
  let info: MarkdownFileInfo;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ClipboardItem', class { constructor(public data: Record<string, Blob>) {} });
    clipboard = new SvgClipboard(app, t);
    info = { file: { path: 'notes/Target.md', basename: 'Target' } } as MarkdownFileInfo;
    write.mockReset().mockResolvedValue(undefined);
    path.mockReset().mockResolvedValue('attachments/Target-diagram 1.svg');
    create.mockReset().mockResolvedValue({ path: 'attachments/Target-diagram 1.svg' });
    link.mockReturnValue('[[Target-diagram 1.svg]]');
    value.mockReturnValue('Original note'); cursor.mockReturnValue({ line: 0, ch: 13 });
  });
  afterEach(() => vi.unstubAllGlobals());

  const eventFor = (html: string, defaultPrevented = false): ClipboardEvent => ({
    defaultPrevented, preventDefault: vi.fn(), clipboardData: { getData: (type: string) => type === 'text/html' ? html : '' },
  }) as unknown as ClipboardEvent;
  async function copiedEvent(): Promise<ClipboardEvent> {
    await clipboard.copy(image, { write } as unknown as Clipboard);
    const item = write.mock.calls.at(-1)![0][0] as { data: Record<string, Blob> };
    return eventFor(await item.data['text/html']!.text());
  }

  it('saves a vector attachment at the receiving note and inserts a host-generated embed', async () => {
    const event = await copiedEvent();
    expect(create).not.toHaveBeenCalled();
    const paste = clipboard.paste(event, editor, info);
    expect(paste).toBeDefined();
    await paste;
    expect(path).toHaveBeenCalledWith('Target-diagram.svg', 'notes/Target.md');
    expect(new TextDecoder().decode(create.mock.calls[0]![1])).toBe(image.svg);
    expect(link).toHaveBeenCalledWith({ path: 'attachments/Target-diagram 1.svg' }, 'notes/Target.md');
    expect(replace).toHaveBeenCalledWith('![[Target-diagram 1.svg]]');
  });
  it.each(['ordinary', 'different-marker', 'already-handled', 'cleared'] as const)('leaves %s clipboard pastes alone', async kind => {
    let event = await copiedEvent();
    if (kind === 'ordinary') event = eventFor('<p>Other clipboard content</p>');
    if (kind === 'different-marker') event = eventFor('<img data-mermaid-beauty-svg="00000000-0000-0000-0000-000000000000">');
    if (kind === 'already-handled') event = eventFor(event.clipboardData!.getData('text/html'), true);
    if (kind === 'cleared') clipboard.clear();
    expect(clipboard.paste(event, editor, info)).toBeUndefined();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled(); expect(replace).not.toHaveBeenCalled();
  });
  it('uses the trusted copied snapshot even if pasted HTML is modified', async () => {
    const event = await copiedEvent();
    await clipboard.paste(eventFor(event.clipboardData!.getData('text/html').replace(encodeURIComponent(image.svg), '<script>untrusted</script>')), editor, info);
    expect(new TextDecoder().decode(create.mock.calls[0]![1])).toBe(image.svg);
  });
  it.each(['typing', 'cursor', 'note', 'unload'] as const)('does not insert into a changed editor after %s during saving', async change => {
    const event = await copiedEvent();
    create.mockImplementation(async () => {
      if (change === 'typing') value.mockReturnValue('New typing');
      if (change === 'cursor') cursor.mockReturnValue({ line: 0, ch: 2 });
      if (change === 'note') Object.defineProperty(info, 'file', { value: { path: 'notes/Other.md' } });
      if (change === 'unload') clipboard.clear();
      return { path: 'attachments/Target-diagram 1.svg' };
    });
    await clipboard.paste(event, editor, info);
    expect(replace).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledWith('SVG saved: attachments/Target-diagram 1.svg. The editor changed; insert this attachment manually.');
  });
  it('reports a failed save without changing the note', async () => {
    const event = await copiedEvent();
    create.mockRejectedValue(new Error('Disk full'));
    await clipboard.paste(event, editor, info);
    expect(replace).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledWith('Could not paste the SVG. Try saving it as SVG instead.');
  });
  it('does not restore clipboard state when an outstanding copy completes after unload', async () => {
    let finish!: () => void;
    write.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const copying = clipboard.copy(image, { write } as unknown as Clipboard);
    clipboard.clear(); finish(); await copying;
    const item = write.mock.calls[0]![0][0] as { data: Record<string, Blob> };
    const event = eventFor(await item.data['text/html']!.text());
    await clipboard.paste(event, editor, info);
    expect(event.preventDefault).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  });
});
