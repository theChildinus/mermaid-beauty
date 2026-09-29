import { getLanguage, loadMermaid, MarkdownView, Notice, Plugin } from 'obsidian';
import { resolveLanguage, translate, type UiLanguage, type UiText } from './i18n';
import { attachRenderer, type MermaidHost } from './bridge';
import { BeautyRenderer } from './renderer';
import { DEFAULT_SETTINGS, loadSettings, type BeautySettings } from './settings';
import { BeautySettingTab } from './settings-tab';

export default class MermaidBeautyPlugin extends Plugin {
  settings: BeautySettings = loadSettings(DEFAULT_SETTINGS);
  private renderer = new BeautyRenderer(() => createDiv(), () => createSvg('style'));
  private detach?: () => void;
  private stopped = false;
  private fallbackReported = false;
  private refreshTimer?: number;
  private commandLanguage?: UiLanguage;
  private pendingSave: Promise<void> = Promise.resolve();

  async onload(): Promise<void> {
    this.settings = loadSettings(await this.loadData());
    this.addSettingTab(new BeautySettingTab(this.app, this));
    this.updateCommands();
    this.registerEvent(this.app.workspace.on('css-change', () => this.refresh()));
    this.app.workspace.onLayoutReady(() => { void this.start(); });
  }

  get language(): UiLanguage { return resolveLanguage(this.settings.language, getLanguage()); }

  t = (text: UiText, values?: Record<string, string>): string => translate(this.language, text, values);

  private updateCommands(): void {
    if (this.commandLanguage === this.language) return;
    if (this.commandLanguage) {
      this.removeCommand('refresh-diagrams');
      this.removeCommand('toggle-rendering');
    }
    this.commandLanguage = this.language;
    this.addCommand({ id: 'refresh-diagrams', name: this.t('Refresh diagrams'), callback: () => this.refresh() });
    this.addCommand({
      id: 'toggle-rendering', name: this.t('Toggle enhanced rendering'),
      callback: () => { void this.save({ ...this.settings, enabled: !this.settings.enabled }); },
    });
  }

  private async start(): Promise<void> {
    try {
      const host = await loadMermaid() as MermaidHost;
      if (this.stopped) return;
      if (typeof host.render !== 'function') throw new Error('Obsidian Mermaid rendering API is unavailable.');
      this.detach = attachRenderer(host, () => this.settings,
        (id, source, container) => this.renderer.render(id, source, this.settings, container),
        () => {
          // Do not log source or error objects: upstream parse errors can include private note text.
          if (!this.fallbackReported) {
            this.fallbackReported = true;
            new Notice(this.t('Mermaid Beauty could not enhance a diagram. Using the existing renderer; check its syntax or custom settings.'));
          }
        });
      this.refresh();
    } catch {
      new Notice(this.t('Mermaid Beauty could not start. Existing Mermaid rendering is unchanged.'));
    }
  }

  async save(settings: BeautySettings): Promise<void> {
    settings = loadSettings(settings);
    this.settings = settings;
    this.updateCommands();
    const write = this.pendingSave.then(() => this.saveData(settings));
    this.pendingSave = write.catch(() => undefined);
    try {
      await write;
      this.fallbackReported = false;
      this.refresh();
    } catch {
      new Notice(this.t('Could not save Mermaid Beauty settings. Please try again.'));
    }
  }

  refresh(): void {
    if (this.stopped) return;
    window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = undefined;
      this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
        if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
      });
      // Refresh editor options as well; cached Live Preview widgets may require
      // switching reading/editing mode. Never rewrite note text to invalidate them.
      this.app.workspace.updateOptions();
    }, 150);
  }

  onunload(): void {
    this.stopped = true;
    window.clearTimeout(this.refreshTimer);
    this.detach?.();
    this.renderer.dispose();
    this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
      if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
    });
    this.app.workspace.updateOptions();
  }
}
