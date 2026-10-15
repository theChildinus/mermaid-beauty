import { getLanguage, loadMermaid, MarkdownView, Notice, Plugin } from 'obsidian';
import { resolveLanguage, translate, type UiLanguage, type UiText } from './i18n';
import { attachRenderer, type MermaidHost } from './bridge';
import { BeautyRenderer } from './renderer';
import { DEFAULT_SETTINGS, hasRenderingChanges, loadSettings, type BeautySettings } from './settings';
import { BeautySettingTab } from './settings-tab';
import { DiagramExportControls, DiagramPicker, exportDiagram } from './export-controls';
import { GettingStartedModal } from './getting-started';
import { SvgClipboard } from './svg-clipboard';
import { DiagramFileExport } from './file-export';

export default class MermaidBeautyPlugin extends Plugin {
  settings: BeautySettings = loadSettings(DEFAULT_SETTINGS);
  private renderer = new BeautyRenderer(() => createDiv(), () => createSvg('style'));
  private detach?: () => void;
  private stopped = false;
  private fallbackReported = false;
  private refreshTimer?: number;
  private commandLanguage?: UiLanguage;
  private pendingSave: Promise<void> = Promise.resolve();
  private saveTimer?: number;
  private saveWaiters: (() => void)[] = [];
  private exportControls = new Set<DiagramExportControls>();
  private svgClipboard = new SvgClipboard(this.app, (text, values) => this.t(text, values));
  private fileExport = new DiagramFileExport(this.app, (text, values) => this.t(text, values),
    () => this.settings.exportFolder, folder => this.save({ ...this.settings, exportFolder: folder }));

  async onload(): Promise<void> {
    this.settings = loadSettings(await this.loadData());
    this.addSettingTab(new BeautySettingTab(this.app, this));
    this.registerMarkdownPostProcessor((element, context) => {
      if (this.stopped) return;
      // Watch only Mermaid sections, including the host's async/trust placeholder.
      if (!element.matches('.mermaid, .mermaid-wrapper') && !element.querySelector('.mermaid, .mermaid-wrapper, code.language-mermaid')) return;
      const controls = new DiagramExportControls(element, context.sourcePath, this.t, this.svgClipboard, this.fileExport);
      this.exportControls.add(controls);
      controls.register(() => this.exportControls.delete(controls));
      context.addChild(controls);
    });
    this.updateCommands();
    this.registerEvent(this.app.workspace.on('css-change', () => this.refresh()));
    this.registerEvent(this.app.workspace.on('editor-paste', (event, editor, info) => {
      if (event.defaultPrevented || this.stopped) return;
      const paste = this.svgClipboard.paste(event, editor, info);
      if (paste) { event.preventDefault(); void paste; }
    }));
    this.app.workspace.onLayoutReady(() => { void this.start(); });
  }

  get language(): UiLanguage { return resolveLanguage(this.settings.language, getLanguage()); }

  t = (text: UiText, values?: Record<string, string>): string => translate(this.language, text, values);

  private updateCommands(): void {
    if (this.commandLanguage === this.language) return;
    if (this.commandLanguage) {
      this.removeCommand('refresh-diagrams');
      this.removeCommand('toggle-rendering');
      for (const id of ['getting-started', 'copy-diagram', 'copy-diagram-svg', 'save-diagram-png', 'save-diagram-svg']) this.removeCommand(id);
    }
    this.commandLanguage = this.language;
    this.addCommand({ id: 'refresh-diagrams', name: this.t('Refresh diagrams'), callback: () => this.refresh() });
    this.addCommand({
      id: 'toggle-rendering', name: this.t('Toggle enhanced rendering'),
      callback: () => { void this.save({ ...this.settings, enabled: !this.settings.enabled }); },
    });
    this.addCommand({ id: 'getting-started', name: this.t('Getting started'), callback: () => this.showGettingStarted() });
    for (const [id, name, action] of [
      ['copy-diagram-svg', 'Copy diagram as SVG', 'copy-svg'],
      ['copy-diagram', 'Copy diagram as PNG', 'copy'],
      ['save-diagram-svg', 'Export diagram as SVG', 'svg'],
      ['save-diagram-png', 'Export diagram as PNG', 'png'],
    ] as const) this.addCommand({ id, name: this.t(name), checkCallback: checking => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const diagrams = Array.from(view?.containerEl.querySelectorAll<SVGSVGElement>('.mermaid > svg.mermaid-beauty-diagram') ?? []);
      if (!diagrams.length || !this.settings.enabled) return false;
      if (!checking) {
        const choose = (svg: SVGSVGElement): void => { void exportDiagram(svg, action, view?.file?.path ?? '', this.t, this.svgClipboard, this.fileExport); };
        if (diagrams.length === 1) choose(diagrams[0]!);
        else new DiagramPicker(this.app, diagrams, choose, this.t).open();
      }
      return true;
    } });
  }

  showGettingStarted(): void { new GettingStartedModal(this.app, this.t, () => this.refresh()).open(); }

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
      if (!this.settings.welcomeSeen) {
        const content = createFragment();
        content.createSpan({ text: this.t('Mermaid Beauty is ready. Open an existing Mermaid note to see the result.') });
        content.createEl('button', { text: this.t('Getting started') }).addEventListener('click', () => this.showGettingStarted());
        const welcome = new Notice(content, 12_000);
        this.register(() => welcome.hide());
        await this.save({ ...this.settings, welcomeSeen: true });
      }
    } catch {
      new Notice(this.t('Mermaid Beauty could not start. Existing Mermaid rendering is unchanged.'));
    }
  }

  /** Apply settings immediately; nearby changes share one serialized disk write. */
  save(settings: BeautySettings): Promise<void> {
    if (this.stopped) return Promise.resolve();
    settings = loadSettings(settings);
    const renderingChanged = hasRenderingChanges(this.settings, settings);
    this.settings = settings;
    this.updateCommands();
    if (renderingChanged) {
      this.fallbackReported = false;
      this.refresh();
    }
    window.clearTimeout(this.saveTimer);
    const saved = new Promise<void>(resolve => this.saveWaiters.push(resolve));
    this.saveTimer = window.setTimeout(() => this.persistSettings(), 150);
    return saved;
  }

  private persistSettings(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    if (!this.saveWaiters.length) return;
    const settings = this.settings;
    const waiters = this.saveWaiters;
    this.saveWaiters = [];
    const write = this.pendingSave.then(() => this.saveData(settings));
    this.pendingSave = write.catch(() => {
      new Notice(this.t('Could not save Mermaid Beauty settings. Please try again.'));
    });
    void this.pendingSave.then(() => { for (const resolve of waiters) resolve(); });
  }

  refresh(): void {
    if (this.stopped) return;
    window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = undefined;
      // The host uses this event when Markdown processors or Mermaid trust change.
      // Both Reading view and Live Preview listen to it; do not redraw Reading view twice.
      this.app.workspace.trigger('post-processor-change');
    }, 150);
  }

  onunload(): void {
    this.stopped = true;
    this.svgClipboard.clear();
    this.fileExport.dispose();
    // Markdown sections can outlive the plugin when the host reuses cached views.
    for (const controls of this.exportControls) controls.unload();
    this.exportControls.clear();
    this.persistSettings();
    window.clearTimeout(this.refreshTimer);
    this.detach?.();
    this.renderer.dispose();
    this.app.workspace.trigger('post-processor-change');
  }
}
