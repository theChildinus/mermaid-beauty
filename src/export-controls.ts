import { MarkdownRenderChild, Menu, Notice, Platform, SuggestModal, setIcon, type App } from 'obsidian';
import { diagramImage, diagramPng } from './diagram-export';
import type { UiText } from './i18n';
import type { SvgClipboard } from './svg-clipboard';
import type { DiagramFileExport } from './file-export';

export type ExportAction = 'copy' | 'copy-svg' | 'png' | 'svg';
type Translate = (text: UiText, values?: Record<string, string>) => string;

/** Export only the selected rendered image, preserving the note and its Mermaid source. */
export function exportDiagram(svg: SVGSVGElement, action: ExportAction, sourcePath: string, t: Translate, svgClipboard: SvgClipboard, files: DiagramFileExport): Promise<void> {
  const run = async (): Promise<void> => {
    const snapshot = diagramImage(svg);
    if (action === 'copy-svg') {
      await svgClipboard.copy(snapshot, svg.ownerDocument.defaultView?.navigator.clipboard);
    } else if (action === 'copy') {
      const clipboard = svg.ownerDocument.defaultView?.navigator.clipboard;
      if (!clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('Clipboard images are unavailable.');
      // Pass the promise during the click gesture: Safari expires clipboard permission after await.
      await clipboard.write([new ClipboardItem({ 'image/png': diagramPng(snapshot, createEl('canvas')) })]);
      new Notice(t('Diagram copied as PNG.'));
    } else {
      await files.save(snapshot, action, sourcePath);
    }
  };
  return run().catch((error: unknown) => {
    const external = error instanceof Error && error.message === 'External image resources cannot be exported.';
    const svgUnsupported = error instanceof Error && error.message === 'SVG clipboard is unavailable.';
    const saveUnsupported = error instanceof Error && error.message === 'Save dialog is unavailable.';
    new Notice(t(external ? 'This diagram contains external images. Use local embedded images before exporting.'
      : svgUnsupported ? 'This device cannot copy SVG images. Save the SVG file and import it instead.'
      : saveUnsupported ? 'The save dialog is unavailable. Restart Obsidian and try again.'
      : action === 'copy' ? 'Could not copy the image. Try saving it as PNG instead.'
      : action === 'copy-svg' ? 'Could not copy the SVG. Try saving it as SVG instead.'
      : 'Could not save the diagram. Check available storage and try again.'));
  });
}

/** The host owns each rendered block; its child releases controls and observers on unload. */
export class DiagramExportControls extends MarkdownRenderChild {
  private observer?: MutationObserver;
  private controls = new Map<SVGSVGElement, { host: HTMLElement; actions: HTMLElement; onScroll: () => void }>();

  constructor(container: HTMLElement, private sourcePath: string, private t: Translate, private svgClipboard: SvgClipboard, private files: DiagramFileExport) { super(container); }

  onload(): void {
    this.scan();
    this.observer = new MutationObserver(() => this.scan());
    this.observer.observe(this.containerEl, { childList: true, subtree: true });
  }

  private scan(): void {
    for (const [svg, { host, actions, onScroll }] of this.controls) if (!this.containerEl.contains(svg)) {
      host.removeEventListener('scroll', onScroll);
      actions.remove(); this.controls.delete(svg);
      if (!host.querySelector('svg.mermaid-beauty-diagram')) host.classList.remove('mermaid-beauty-container');
    }
    for (const svg of this.containerEl.querySelectorAll<SVGSVGElement>('svg.mermaid-beauty-diagram')) {
      if (this.controls.has(svg) || !svg.parentElement?.matches('.mermaid')) continue;
      const parent = svg.parentElement;
      if (parent.querySelector(':scope > .mermaid-beauty-actions')) continue;
      // Obsidian can insert render().svg without invoking bindFunctions().
      parent.classList.add('mermaid-beauty-container');
      // Share the diagram's bottom edge with Zoom, which owns the right corner.
      // Append after the diagram so Zoom's first-SVG lookup skips our icon.
      const actions = parent.createDiv({ cls: 'mermaid-beauty-actions' });
      const onScroll = (): void => { actions.style.setProperty('--mermaid-beauty-scroll-offset', `${parent.scrollLeft}px`); };
      parent.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      const button = actions.createEl('button', { cls: 'mermaid-beauty-export', attr: {
        type: 'button', 'aria-label': this.t('Copy and export'), title: this.t('Copy and export'),
      } });
      setIcon(button, 'image-down');
      // Zoom captures mouse pointers on the diagram when panning is unlocked.
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        const menu = new Menu();
        for (const [action, label, icon] of [
          ['copy-svg', 'Copy as SVG', 'copy'], ['copy', 'Copy as PNG', 'copy'],
          ['svg', Platform.isDesktopApp ? 'Export as SVG…' : 'Export as SVG', 'file-code'],
          ['png', Platform.isDesktopApp ? 'Export as PNG…' : 'Export as PNG', 'image-down'],
        ] as const) {
          if (action === 'svg') menu.addSeparator();
          menu.addItem(item => item.setTitle(this.t(label)).setIcon(icon)
            .onClick(() => { void exportDiagram(svg, action, this.sourcePath, this.t, this.svgClipboard, this.files); }));
        }
        menu.showAtMouseEvent(event);
      });
      this.controls.set(svg, { host: parent, actions, onScroll });
    }
  }

  onunload(): void {
    this.observer?.disconnect();
    for (const { host, actions, onScroll } of this.controls.values()) {
      host.removeEventListener('scroll', onScroll);
      host.classList.remove('mermaid-beauty-container');
      actions.remove();
    }
    this.controls.clear();
  }
}

export class DiagramPicker extends SuggestModal<SVGSVGElement> {
  constructor(app: App, private diagrams: SVGSVGElement[], private choose: (svg: SVGSVGElement) => void, t: Translate) {
    super(app); this.setPlaceholder(t('Choose a diagram'));
  }
  getSuggestions(query: string): SVGSVGElement[] { return this.diagrams.filter(svg => this.getSuggestionText(svg).toLowerCase().includes(query.toLowerCase())); }
  private getSuggestionText(svg: SVGSVGElement): string {
    const labels = Array.from(svg.querySelectorAll('text, foreignObject')).map(el => el.textContent?.trim()).filter(Boolean).join(' · ');
    return `${this.diagrams.indexOf(svg) + 1}. ${labels.slice(0, 100) || svg.getAttribute('aria-label') || 'Mermaid'}`;
  }
  renderSuggestion(svg: SVGSVGElement, el: HTMLElement): void { el.setText(this.getSuggestionText(svg)); }
  onChooseSuggestion(svg: SVGSVGElement): void { this.choose(svg); }
}
