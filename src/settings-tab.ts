import { PluginSettingTab, Setting, type App, type ColorComponent, type TextComponent } from 'obsidian';
import { CONNECTORS } from './line-width';
import type { LanguageSetting, UiText } from './i18n';
import { COLOR_FIELDS, normalizeColor, paletteColors, type ColorMode } from './colors';
import type MermaidBeautyPlugin from './main';
import { DIAGRAM_TYPES, PALETTES, parseCustomConfig, resolveAppearance,
  type Appearance, type DiagramType, type LayoutName, type PaletteName, type RenderMode } from './settings';
import { supportsGraphLayout } from './theme';

export class BeautySettingTab extends PluginSettingTab {
  private selected: DiagramType = 'flowchart';
  private colorMode: ColorMode = 'light';
  constructor(app: App, private plugin: MermaidBeautyPlugin) { super(app, plugin); }

  display(): void {
    const t = this.plugin.t;
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('mermaid-beauty-settings');
    containerEl.createEl('p', { cls: 'mermaid-beauty-help', text:
      t('All diagram types use enhanced rendering by default. Existing Mermaid blocks stay editable. Disable other Mermaid replacement plugins before enabling this one.') });
    new Setting(containerEl).setName(t('Language')).setDesc(t('Changes settings, commands, and notices. Diagram text stays unchanged.'))
      .addDropdown(dropdown => dropdown.addOptions({ auto: t('Follow Obsidian'), zh: '中文', en: 'English' })
        .setValue(this.plugin.settings.language).onChange(async language => {
          await this.plugin.save({ ...this.plugin.settings, language: language as LanguageSetting });
          this.display();
        }));
    new Setting(containerEl).setName(t('Enhanced rendering')).setDesc(t('Turn off to use the existing renderer for every diagram.'))
      .addToggle(toggle => toggle.setValue(this.plugin.settings.enabled).onChange(async enabled => {
        await this.plugin.save({ ...this.plugin.settings, enabled });
      }));
    new Setting(containerEl).setName(t('Default appearance')).setHeading();
    this.appearanceControls(containerEl, this.plugin.settings.defaults);

    new Setting(containerEl).setName(t('Diagram types')).setHeading();
    new Setting(containerEl).setName(t('Diagram type')).setDesc(t('Only this type is affected by the settings below.'))
      .addDropdown(dropdown => dropdown.addOptions(Object.fromEntries(Object.entries(DIAGRAM_TYPES).map(([key, label]) => [key, t(label)]))).setValue(this.selected).onChange(value => {
        this.selected = value as DiagramType;
        this.display();
      }));
    const type = this.selected;
    const override = this.plugin.settings.types[type] ?? {};
    new Setting(containerEl).setName(t('Renderer')).setDesc(t('Inherit uses enhanced rendering and the default appearance.'))
      .addDropdown(dropdown => dropdown.addOptions({ inherit: t('Inherit defaults'), beauty: t('Enhanced, with custom appearance'), native: t('Existing renderer') })
        .setValue(override.mode ?? 'inherit').onChange(async value => {
          const mode = value as RenderMode;
          const types = { ...this.plugin.settings.types, [type]: mode === 'inherit' ? {} : { ...this.plugin.settings.types[type], mode } };
          await this.plugin.save({ ...this.plugin.settings, types });
          this.display();
        }));
    if (override.mode === 'beauty') {
      this.appearanceControls(containerEl, resolveAppearance(this.plugin.settings, type), type);
      new Setting(containerEl).setName(t('Custom Mermaid options')).setDesc(
        t('Optional JSON. For example: {"themeVariables":{"primaryColor":"#e5edff"},"sequence":{"actorMargin":70}}. Diagram frontmatter takes precedence.'));
      const editor = containerEl.createEl('textarea', { cls: 'mermaid-beauty-config', attr: { 'aria-label': t('Custom Mermaid options'), spellcheck: 'false' } });
      editor.value = override.config ?? '';
      const feedback = containerEl.createEl('p', { cls: 'mermaid-beauty-error', attr: { role: 'status' } });
      new Setting(containerEl).addButton(button => button.setButtonText(t('Apply custom options')).setCta().onClick(async () => {
        try {
          parseCustomConfig(editor.value, this.plugin.language);
          const types = { ...this.plugin.settings.types, [type]: { ...this.plugin.settings.types[type], config: editor.value } };
          await this.plugin.save({ ...this.plugin.settings, types });
          feedback.setText('');
        } catch (error) {
          feedback.setText(error instanceof Error ? error.message : t('Invalid custom options.'));
        }
      }));
    }
    new Setting(containerEl).setName(t('Reset this type')).setDesc(t('Remove overrides and use the default appearance.'))
      .addButton(button => button.setButtonText(t('Reset')).onClick(async () => {
        const types = { ...this.plugin.settings.types };
        delete types[type];
        await this.plugin.save({ ...this.plugin.settings, types });
        this.display();
      }));
    new Setting(containerEl).setName(t('Refresh diagrams')).setDesc(t('Refresh open previews after changing settings. Reopen a note if another plugin has cached its diagram.'))
      .addButton(button => button.setButtonText(t('Refresh')).onClick(() => this.plugin.refresh()));
  }

  private appearanceControls(container: HTMLElement, value: Appearance, type?: DiagramType): void {
    const t = this.plugin.t;
    const update = async (patch: Partial<Appearance>): Promise<void> => {
      const current = this.plugin.settings;
      await this.plugin.save(type
        ? { ...current, types: { ...current.types, [type]: { ...current.types[type], ...patch } } }
        : { ...current, defaults: { ...current.defaults, ...patch } });
    };
    const custom = value.useCustomColors ?? Object.values(value.colors ?? {}).some(colors => Object.keys(colors).length > 0);
    new Setting(container).setName(t('Color palette')).setDesc(t('Choose a ready-made palette or customize your own. Switching presets keeps your custom colors saved.'));
    const choices = container.createDiv({ cls: 'mermaid-beauty-palettes', attr: { role: 'group', 'aria-label': t('Color palette') } });
    const selected = custom ? 'custom' : value.palette;
    const darkPreview = document.body.classList.contains('theme-dark');
    for (const [name, label] of [...Object.entries(PALETTES), ['custom', 'Custom']]) {
      const button = choices.createEl('button', { cls: 'mermaid-beauty-palette-choice', attr: {
        type: 'button', 'aria-label': t('{name} palette', { name: t(label as UiText) }), 'aria-pressed': String(selected === name),
      } });
      const preview = paletteColors(name === 'custom' ? { ...value, useCustomColors: true }
        : { ...value, palette: name as PaletteName, colors: undefined }, darkPreview);
      const swatches = button.createSpan({ cls: 'mermaid-beauty-swatches', attr: { 'aria-hidden': 'true' } });
      for (const key of ['surface', 'border', 'line', 'text', 'accent'] as const) {
        swatches.createSpan().style.setProperty('--mermaid-beauty-swatch', preview[key]);
      }
      button.createSpan({ text: t(label as UiText), cls: 'mermaid-beauty-palette-name' });
      button.createSpan({ text: t(name === 'custom' ? 'Your own colors' : 'Ready to use'), cls: 'mermaid-beauty-palette-caption' });
      button.addEventListener('click', () => { void (async () => {
        await update(name === 'custom' ? { useCustomColors: true } : { palette: name as PaletteName, useCustomColors: false });
        this.display();
      })(); });
    }
    if (custom) {
      new Setting(container).setName(t('Customize colors')).setDesc(t('Edit light and dark colors separately. Rendering follows the Obsidian theme.'))
        .addDropdown(dropdown => dropdown.addOptions({ light: t('Light mode'), dark: t('Dark mode') }).setValue(this.colorMode)
          .onChange(mode => { this.colorMode = mode as ColorMode; this.display(); }));
      const mode = this.colorMode;
      const colors = paletteColors(value, mode === 'dark');
      const colorContainer = container.createDiv({ cls: 'mermaid-beauty-colors' });
      for (const key of Object.keys(COLOR_FIELDS) as (keyof typeof COLOR_FIELDS)[]) {
        let picker: ColorComponent;
        let hex: TextComponent;
        const saveColor = async (input: string): Promise<void> => {
          const color = normalizeColor(input);
          hex.inputEl.setCustomValidity(color ? '' : t('Enter a hex color, such as #26845b.'));
          hex.inputEl.toggleClass('is-invalid', !color);
          hex.inputEl.setAttribute('aria-invalid', String(!color));
          if (!color) { hex.inputEl.reportValidity(); return; }
          picker.setValue(color);
          hex.setValue(color);
          const current = type ? this.plugin.settings.types[type] : this.plugin.settings.defaults;
          await update({ colors: { ...current?.colors, [mode]: { ...current?.colors?.[mode], [key]: color } } });
        };
        const row = new Setting(colorContainer).setName(t(COLOR_FIELDS[key]))
          .addColorPicker(component => {
            picker = component;
            picker.setValue(colors[key]).onChange(color => { void saveColor(color); });
          })
          .addText(component => {
            hex = component;
            hex.setValue(colors[key]);
            hex.inputEl.addClass('mermaid-beauty-hex');
            hex.inputEl.setAttribute('aria-label', t('{name} hex color', { name: t(COLOR_FIELDS[key]) }));
            hex.inputEl.spellcheck = false;
            hex.inputEl.addEventListener('change', () => { void saveColor(hex.getValue()); });
          });
        row.controlEl.querySelector('input[type="color"]')?.setAttribute('aria-label', t('{name} color', { name: t(COLOR_FIELDS[key]) }));
      }
      new Setting(container).setName(t('Reset colors')).setDesc(t('Remove saved custom colors in both modes and return to the selected preset.'))
        .addButton(button => button.setButtonText(t('Reset colors')).onClick(async () => {
          await update({ colors: undefined, useCustomColors: false });
          this.display();
        }));
    }
    for (const [key, name, description, min, max, step] of [
      ['fontSize', 'Font size', 'Text size in pixels.', 10, 28, 1],
      ['radius', 'Corner radius', 'Round the corners of supported rectangular nodes, in pixels. Semantic shapes stay unchanged.', 0, 24, 1],
      ['spacing', 'Graph spacing', 'Space between nodes and ranks, where supported by the layout. Larger values spread the diagram out.', 20, 120, 1],
      ['lineWidth', 'Line width', 'Pixels. 0 keeps the current default widths. Applies to connectors; node borders and data-scaled chart bands keep their own widths.', 0, 6, 0.1],
    ] as const) {
      if (key === 'lineWidth' && type && !CONNECTORS[type]) continue;
      new Setting(container).setName(t(name)).setDesc(t(description))
        .addSlider(slider => slider.setLimits(min, max, step).setValue(value[key]).setDynamicTooltip()
          .onChange(async number => update({ [key]: number })));
    }
    if (!type || supportsGraphLayout(type)) new Setting(container).setName(t('Graph layout'))
      .setDesc(t('Automatic uses ELK for supported relationship diagrams. Other types retain their specialized layout.'))
      .addDropdown(dropdown => dropdown.addOptions({ auto: t('Automatic'), elk: 'ELK', dagre: 'Dagre' })
        .setValue(value.layout).onChange(async layout => update({ layout: layout as LayoutName })));
    new Setting(container).setName(t('Fit available width')).setDesc(t('Shrink wide diagrams to fit the note. Turn off to allow horizontal scrolling.'))
      .addToggle(toggle => toggle.setValue(value.fitWidth).onChange(async fitWidth => update({ fitWidth })));
  }
}
