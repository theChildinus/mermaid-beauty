import { Modal, Setting, type App } from 'obsidian';
import type { UiText } from './i18n';

export class GettingStartedModal extends Modal {
  constructor(app: App, private t: (text: UiText) => string, private refresh: () => void) { super(app); }
  onOpen(): void {
    this.setTitle(this.t('Getting started'));
    this.contentEl.createEl('p', { text: this.t('Open a note with a Mermaid code block. Its source stays unchanged; the enhanced diagram appears in Reading view or Live Preview after the cursor leaves the block.') });
    this.contentEl.createEl('p', { text: this.t('If Obsidian asks to display Mermaid diagrams, allow it only if you trust the vault. You can also use Settings → Editor → Show Mermaid diagrams in notes. Mermaid Beauty never changes this permission.') });
    this.contentEl.createEl('p', { text: this.t('If an existing diagram still looks unchanged, refresh it below. Other Mermaid renderer plugins can conflict; keep only one renderer enabled.') });
    new Setting(this.contentEl).addButton(button => button.setButtonText(this.t('Refresh diagrams')).setCta().onClick(() => { this.refresh(); this.close(); }));
    this.contentEl.createEl('p', { text: this.t('Use Copy and export in the bottom-left corner of an enhanced diagram. Copy PNG/SVG directly, or choose a filename and location when exporting on desktop. The first export starts in your attachment folder; later exports remember the last successful location. Mobile exports save to the attachment folder. Paste SVG into an Obsidian note to insert a vector image attachment.') });
  }
  onClose(): void { this.contentEl.empty(); }
}
