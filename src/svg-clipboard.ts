import { Notice, type App, type Editor, type MarkdownFileInfo } from 'obsidian';
import type { DiagramImage } from './diagram-export';
import type { UiText } from './i18n';

/** Owns the last copied snapshot; Obsidian does not import the SVG clipboard MIME itself. */
export class SvgClipboard {
  private copied?: { token: string; svg: string };
  private generation = 0;
  private hintShown = false;

  constructor(private app: App, private t: (text: UiText, values?: Record<string, string>) => string) {}

  async copy(image: DiagramImage, clipboard: Clipboard | undefined): Promise<void> {
    if (!clipboard?.write || typeof ClipboardItem === 'undefined'
      || (typeof ClipboardItem.supports === 'function' && !ClipboardItem.supports('image/svg+xml'))) {
      throw new Error('SVG clipboard is unavailable.');
    }
    const copied = { token: crypto.randomUUID(), svg: image.svg };
    const generation = this.generation;
    const html = `<img data-mermaid-beauty-svg="${copied.token}" alt="Mermaid diagram" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.svg)}">`;
    await clipboard.write([new ClipboardItem({
      'image/svg+xml': new Blob([image.svg], { type: 'image/svg+xml' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    })]);
    if (generation === this.generation) {
      this.copied = copied;
      new Notice(this.t(this.hintShown ? 'Diagram copied as SVG.' : 'SVG copied. Paste into an app that supports SVG, or export the SVG file.'), this.hintShown ? 4000 : 8000);
      this.hintShown = true;
    }
  }

  /** Handle only our own clipboard marker and trusted snapshot, never arbitrary pasted SVG. */
  paste(event: ClipboardEvent, editor: Editor, info: MarkdownFileInfo): Promise<void> | undefined {
    const copied = this.copied;
    if (event.defaultPrevented || !copied || !info.file) return;
    const token = event.clipboardData?.getData('text/html').match(/data-mermaid-beauty-svg=["']([\da-f-]+)["']/i)?.[1];
    if (token !== copied.token) return;
    return this.insert(copied.svg, editor, info, info.file.path, info.file.basename);
  }

  private async insert(svg: string, editor: Editor, info: MarkdownFileInfo, sourcePath: string, basename: string): Promise<void> {
    const generation = this.generation;
    const before = editor.getValue(), from = editor.getCursor('from'), to = editor.getCursor('to');
    try {
      const name = (basename || 'diagram').replace(/[\\/:*?"<>|]/g, '-');
      const path = await this.app.fileManager.getAvailablePathForAttachment(`${name}-diagram.svg`, sourcePath);
      const file = await this.app.vault.createBinary(path, await new Blob([svg], { type: 'image/svg+xml' }).arrayBuffer());
      const nowFrom = editor.getCursor('from'), nowTo = editor.getCursor('to');
      // Do not replace new typing, a moved selection, or a different note after an async save.
      if (generation !== this.generation || info.file?.path !== sourcePath || editor.getValue() !== before
        || nowFrom.line !== from.line || nowFrom.ch !== from.ch || nowTo.line !== to.line || nowTo.ch !== to.ch) {
        new Notice(this.t('SVG saved: {path}. The editor changed; insert this attachment manually.', { path }));
        return;
      }
      editor.replaceSelection(`!${this.app.fileManager.generateMarkdownLink(file, sourcePath)}`);
    } catch {
      new Notice(this.t('Could not paste the SVG. Try saving it as SVG instead.'));
    }
  }

  clear(): void { this.generation++; this.copied = undefined; }
}
