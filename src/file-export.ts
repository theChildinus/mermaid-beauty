import { FileSystemAdapter, Notice, Platform, normalizePath, type App } from 'obsidian';
import { diagramPng, type DiagramImage } from './diagram-export';
import type { UiText } from './i18n';

type Translate = (text: UiText, values?: Record<string, string>) => string;
type Format = 'svg' | 'png';
type SaveOptions = { title: string; defaultPath: string; filters: { name: string; extensions: string[] }[]; properties: string[] };
// Obsidian's desktop host exposes Electron remote; load it only after the platform check.
type DesktopRemote = {
  dialog: { showSaveDialog(options: SaveOptions): Promise<{ canceled: boolean; filePath?: string }> };
  shell: { showItemInFolder(path: string): void };
};

/** Owns file selection and completion feedback; copying never calls this service. */
export class DiagramFileExport {
  private stopped = false;
  private busy = false;
  private notice?: Notice;

  constructor(private app: App, private t: Translate,
    private lastFolder: () => string | undefined, private rememberFolder: (folder: string) => Promise<void>) {}

  async save(image: DiagramImage, format: Format, sourcePath: string): Promise<void> {
    if (this.stopped) return;
    if (this.busy) { new Notice(this.t('Finish the current export before starting another.')); return; }
    this.busy = true;
    try {
      const name = (sourcePath.split('/').pop()?.replace(/\.md$/i, '') || 'diagram').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `${name}-diagram.${format}`;
      if (!Platform.isDesktopApp) {
        const data = await this.bytes(image, format);
        if (this.stopped) return;
        const path = await this.app.fileManager.getAvailablePathForAttachment(filename, sourcePath);
        if (this.stopped) return;
        await this.app.vault.createBinary(path, data);
        if (!this.stopped) this.showNotice(this.t('Diagram saved: {path}', { path }));
        return;
      }

      const load = (window as Window & { require?: (name: string) => unknown }).require;
      if (!load || !(this.app.vault.adapter instanceof FileSystemAdapter)) throw new Error('Save dialog is unavailable.');
      const remote = (load('electron') as { remote?: DesktopRemote }).remote;
      if (!remote?.dialog?.showSaveDialog) throw new Error('Save dialog is unavailable.');
      const fs = load('fs/promises') as typeof import('node:fs/promises');
      const paths = load('path') as typeof import('node:path');
      let folder = this.lastFolder();
      if (folder && !paths.isAbsolute(folder)) folder = undefined;
      if (folder) {
        try { if (!(await fs.stat(folder)).isDirectory()) folder = undefined; }
        catch (error) {
          if (['ENOENT', 'ENOTDIR', 'EACCES'].includes((error as { code?: string }).code ?? '')) folder = undefined;
          else throw error;
        }
      }
      folder ??= await this.attachmentFolder(sourcePath);
      if (this.stopped) return;
      const result = await remote.dialog.showSaveDialog({
        title: this.t(format === 'svg' ? 'Export diagram as SVG' : 'Export diagram as PNG'),
        defaultPath: paths.join(folder, filename),
        filters: [{ name: format.toUpperCase(), extensions: [format] }],
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      });
      if (result.canceled || !result.filePath || this.stopped) return;
      // Keep the exact path confirmed by the system dialog, including its overwrite prompt.
      const path = result.filePath;
      const data = await this.bytes(image, format);
      if (this.stopped) return;
      await fs.writeFile(path, new Uint8Array(data));
      if (this.stopped) return;
      await this.rememberFolder(paths.dirname(path));
      if (this.stopped) return;
      const content = createFragment();
      const body = content.createDiv({ cls: 'mermaid-beauty-export-notice' });
      body.createDiv({ text: this.t('Exported {name}', { name: paths.basename(path) }) });
      body.createDiv({ cls: 'mermaid-beauty-export-path', text: paths.dirname(path) });
      body.createEl('button', { text: this.t('Show in folder'), attr: { type: 'button' } }).addEventListener('click', () => {
        try { remote.shell.showItemInFolder(path); this.notice?.hide(); }
        catch { this.showNotice(this.t('Could not show the file. Open this folder: {path}', { path: paths.dirname(path) })); }
      });
      this.showNotice(content);
    } finally { this.busy = false; }
  }

  private async bytes(image: DiagramImage, format: Format): Promise<ArrayBuffer> {
    const blob = format === 'svg' ? new Blob([image.svg], { type: 'image/svg+xml' }) : await diagramPng(image, createEl('canvas'));
    return blob.arrayBuffer();
  }

  private async attachmentFolder(sourcePath: string): Promise<string> {
    // getAvailablePathForAttachment creates missing folders. Read the saved preference
    // instead so opening or cancelling the desktop dialog never creates vault files.
    const configPath = normalizePath(`${this.app.vault.configDir}/app.json`);
    let attachment = '';
    if (await this.app.vault.adapter.exists(configPath)) {
      const config = JSON.parse(await this.app.vault.adapter.read(configPath)) as { attachmentFolderPath?: unknown };
      if (typeof config?.attachmentFolderPath === 'string') attachment = config.attachmentFolderPath;
    }
    const parent = sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/')) : '';
    const relative = attachment === '.' || attachment === './' ? parent
      : attachment.startsWith('./') ? `${parent}/${attachment.slice(2)}` : attachment;
    return (this.app.vault.adapter as FileSystemAdapter).getFullPath(normalizePath(relative));
  }

  private showNotice(content: string | DocumentFragment): void {
    this.notice?.hide();
    this.notice = new Notice(content, 12_000);
  }

  dispose(): void { this.stopped = true; this.notice?.hide(); }
}
