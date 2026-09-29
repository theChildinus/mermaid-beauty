import { PluginSettingTab, Setting, type App } from 'obsidian';
import type MermaidBeautyPlugin from './main';
import { DIAGRAM_TYPES, PALETTES, parseCustomConfig, resolveAppearance,
  type Appearance, type DiagramType, type LayoutName, type PaletteName, type RenderMode } from './settings';
import { supportsGraphLayout } from './theme';

export class BeautySettingTab extends PluginSettingTab {
  private selected: DiagramType = 'flowchart';
  constructor(app: App, private plugin: MermaidBeautyPlugin) { super(app, plugin); }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('mermaid-beauty-settings');
    containerEl.createEl('p', { cls: 'mermaid-beauty-help', text:
      'All diagram types use enhanced rendering by default. Existing Mermaid blocks stay editable. Disable other Mermaid replacement plugins before enabling this one.' });
    new Setting(containerEl).setName('Enhanced rendering').setDesc('Turn off to use the existing renderer for every diagram.')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.enabled).onChange(async enabled => {
        await this.plugin.save({ ...this.plugin.settings, enabled });
      }));
    new Setting(containerEl).setName('Default appearance').setHeading();
    this.appearanceControls(containerEl, this.plugin.settings.defaults);

    new Setting(containerEl).setName('Diagram types').setHeading();
    new Setting(containerEl).setName('Diagram type').setDesc('Only this type is affected by the settings below.')
      .addDropdown(dropdown => dropdown.addOptions(DIAGRAM_TYPES).setValue(this.selected).onChange(value => {
        this.selected = value as DiagramType;
        this.display();
      }));
    const type = this.selected;
    const override = this.plugin.settings.types[type] ?? {};
    new Setting(containerEl).setName('Renderer').setDesc('Inherit uses enhanced rendering and the default appearance.')
      .addDropdown(dropdown => dropdown.addOptions({ inherit: 'Inherit defaults', beauty: 'Enhanced, with custom appearance', native: 'Existing renderer' })
        .setValue(override.mode ?? 'inherit').onChange(async value => {
          const mode = value as RenderMode;
          const types = { ...this.plugin.settings.types, [type]: mode === 'inherit' ? {} : { ...override, mode } };
          await this.plugin.save({ ...this.plugin.settings, types });
          this.display();
        }));
    if (override.mode === 'beauty') {
      this.appearanceControls(containerEl, resolveAppearance(this.plugin.settings, type), type);
      new Setting(containerEl).setName('Custom Mermaid options').setDesc(
        'Optional JSON. For example: {"themeVariables":{"primaryColor":"#e5edff"},"sequence":{"actorMargin":70}}. Diagram frontmatter takes precedence.');
      const editor = containerEl.createEl('textarea', { cls: 'mermaid-beauty-config', attr: { 'aria-label': 'Custom Mermaid options', spellcheck: 'false' } });
      editor.value = override.config ?? '';
      const feedback = containerEl.createEl('p', { cls: 'mermaid-beauty-error', attr: { role: 'status' } });
      new Setting(containerEl).addButton(button => button.setButtonText('Apply custom options').setCta().onClick(async () => {
        try {
          parseCustomConfig(editor.value);
          const types = { ...this.plugin.settings.types, [type]: { ...this.plugin.settings.types[type], config: editor.value } };
          await this.plugin.save({ ...this.plugin.settings, types });
          feedback.setText('');
        } catch (error) {
          feedback.setText(error instanceof Error ? error.message : 'Invalid custom options.');
        }
      }));
    }
    new Setting(containerEl).setName('Reset this type').setDesc('Remove overrides and use the default appearance.')
      .addButton(button => button.setButtonText('Reset').onClick(async () => {
        const types = { ...this.plugin.settings.types };
        delete types[type];
        await this.plugin.save({ ...this.plugin.settings, types });
        this.display();
      }));
    new Setting(containerEl).setName('Refresh diagrams').setDesc('Refresh open previews after changing settings. Reopen a note if another plugin has cached its diagram.')
      .addButton(button => button.setButtonText('Refresh').onClick(() => this.plugin.refresh()));
  }

  private appearanceControls(container: HTMLElement, value: Appearance, type?: DiagramType): void {
    const update = async (patch: Partial<Appearance>): Promise<void> => {
      const current = this.plugin.settings;
      await this.plugin.save(type
        ? { ...current, types: { ...current.types, [type]: { ...current.types[type], ...patch } } }
        : { ...current, defaults: { ...current.defaults, ...patch } });
    };
    new Setting(container).setName('Palette').addDropdown(dropdown => dropdown.addOptions(PALETTES)
      .setValue(value.palette).onChange(async palette => update({ palette: palette as PaletteName })));
    for (const [key, name, min, max] of [
      ['fontSize', 'Font size', 10, 28], ['radius', 'Corner radius', 0, 24], ['spacing', 'Graph spacing', 20, 120],
    ] as const) {
      new Setting(container).setName(name).setDesc(key === 'spacing' ? 'Applies where the diagram layout supports spacing controls.' : 'Pixels.')
        .addSlider(slider => slider.setLimits(min, max, 1).setValue(value[key]).setDynamicTooltip()
          .onChange(async number => update({ [key]: number })));
    }
    if (!type || supportsGraphLayout(type)) new Setting(container).setName('Graph layout')
      .setDesc('Automatic uses ELK for supported relationship diagrams. Other types retain their specialized layout.')
      .addDropdown(dropdown => dropdown.addOptions({ auto: 'Automatic', elk: 'ELK', dagre: 'Dagre' })
        .setValue(value.layout).onChange(async layout => update({ layout: layout as LayoutName })));
    new Setting(container).setName('Fit available width').setDesc('Shrink wide diagrams to fit the note. Turn off to allow horizontal scrolling.')
      .addToggle(toggle => toggle.setValue(value.fitWidth).onChange(async fitWidth => update({ fitWidth })));
  }
}
