import { PluginSettingTab, Setting, SettingGroup, requireApiVersion, type App, type ColorComponent, type TextComponent,
  type SettingDefinition, type SettingDefinitionItem, type SettingDefinitionRender } from 'obsidian';
import { CONNECTORS } from './line-width';
import type { LanguageSetting, UiText } from './i18n';
import { COLOR_FIELDS, normalizeColor, paletteColors, type ColorMode } from './colors';
import type MermaidBeautyPlugin from './main';
import { DIAGRAM_TYPES, MULTICOLOR_PALETTES, parseCustomConfig, resolveAppearance,
  type Appearance, type DiagramType, type LayoutName, type MulticolorPaletteName, type PaletteName, type RenderMode } from './settings';
import { componentPalette } from './component-theme';
import { supportsGraphLayout } from './theme';

export class BeautySettingTab extends PluginSettingTab {
  private selected: DiagramType = 'flowchart';
  private colorMode: ColorMode = 'light';
  private customOpen = false;
  constructor(app: App, private plugin: MermaidBeautyPlugin) { super(app, plugin); }

  private row(name: UiText, desc: UiText | undefined, render: (setting: Setting) => void): SettingDefinitionRender {
    return { name: this.plugin.t(name), desc: desc ? this.plugin.t(desc) : undefined, render };
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const t = this.plugin.t;
    const type = this.selected;
    const override = this.plugin.settings.types[type] ?? {};
    const types: SettingDefinition[] = [
      this.row('Diagram type', 'Only this type is affected by the settings below.', setting => {
        setting.addDropdown(dropdown => dropdown.addOptions(Object.fromEntries(Object.entries(DIAGRAM_TYPES).map(([key, label]) => [key, t(label)])))
          .setValue(this.selected).onChange(value => { this.selected = value as DiagramType; this.refreshSettings(); }));
      }),
      this.row('Renderer', 'Inherit uses the default appearance and keeps your custom settings saved.', setting => {
        setting.addDropdown(dropdown => dropdown.addOptions({ inherit: t('Inherit defaults'), beauty: t('Enhanced, with custom appearance'), native: t('Existing renderer') })
          .setValue(override.mode ?? 'inherit').onChange(async value => {
            const mode = value as RenderMode;
            const types = { ...this.plugin.settings.types, [type]: { ...this.plugin.settings.types[type], mode } };
            await this.plugin.save({ ...this.plugin.settings, types });
            this.refreshSettings();
          }));
      }),
    ];
    if (override.mode === 'beauty') {
      types.push(...this.appearanceControls(resolveAppearance(this.plugin.settings, type), type));
      types.push(this.row('Custom Mermaid options',
        'Optional JSON. For example: {"themeVariables":{"primaryColor":"#e5edff"},"sequence":{"actorMargin":70}}. Diagram frontmatter takes precedence.', setting => {
          setting.setClass('mermaid-beauty-stacked');
          const editor = setting.controlEl.createEl('textarea', { cls: 'mermaid-beauty-config', attr: { 'aria-label': t('Custom Mermaid options'), spellcheck: 'false' } });
          editor.value = override.config ?? '';
          const feedback = setting.controlEl.createEl('p', { cls: 'mermaid-beauty-error', attr: { role: 'status' } });
          setting.addButton(button => button.setButtonText(t('Apply custom options')).setCta().onClick(async () => {
            try {
              parseCustomConfig(editor.value, this.plugin.language);
              const types = { ...this.plugin.settings.types, [type]: { ...this.plugin.settings.types[type], config: editor.value } };
              await this.plugin.save({ ...this.plugin.settings, types });
              feedback.setText('');
            } catch (error) { feedback.setText(error instanceof Error ? error.message : t('Invalid custom options.')); }
          }));
        }));
    }
    types.push(this.row('Reset this type', 'Remove overrides and use the default appearance.', setting => {
      setting.addButton(button => button.setButtonText(t('Reset')).onClick(async () => {
        const types = { ...this.plugin.settings.types }; delete types[type];
        await this.plugin.save({ ...this.plugin.settings, types }); this.refreshSettings();
      }));
    }));
    return [
      { name: 'Mermaid Beauty', desc: t('All diagram types use enhanced rendering by default. Existing Mermaid blocks stay editable. Disable other Mermaid replacement plugins before enabling this one.') },
      this.row('Language', 'Changes settings, commands, and notices. Diagram text stays unchanged.', setting => {
        setting.addDropdown(dropdown => dropdown.addOptions({ auto: t('Follow Obsidian'), zh: '中文', en: 'English' })
          .setValue(this.plugin.settings.language).onChange(async language => {
            await this.plugin.save({ ...this.plugin.settings, language: language as LanguageSetting }); this.refreshSettings();
          }));
      }),
      this.row('Enhanced rendering', 'Turn off to use the existing renderer for every diagram.', setting => {
        setting.addToggle(toggle => toggle.setValue(this.plugin.settings.enabled).onChange(async enabled => {
          await this.plugin.save({ ...this.plugin.settings, enabled });
        }));
      }),
      { type: 'group', heading: t('Default appearance'), cls: 'mermaid-beauty-settings', items: this.appearanceControls(this.plugin.settings.defaults) },
      { type: 'group', heading: t('Diagram types'), cls: 'mermaid-beauty-settings', items: types },
      this.row('Refresh diagrams', 'Refresh open previews after changing settings. Reopen a note if another plugin has cached its diagram.', setting => {
        setting.addButton(button => button.setButtonText(t('Refresh')).onClick(() => this.plugin.refresh()));
      }),
    ];
  }

  // Use the same named definitions for search in 1.13 and rendering in 1.12.7.
  // The minimum supported host predates the declarative settings renderer.
  display(): void { this.renderSettings(); }

  private refreshSettings(): void {
    if (requireApiVersion('1.13.0')) this.update();
    this.renderSettings();
  }

  private renderSettings(): void {
    const container = this.containerEl;
    container.empty(); container.addClass('mermaid-beauty-settings');
    const renderRow = (definition: SettingDefinition, group: SettingGroup): void => {
      group.addSetting(setting => {
        setting.setName(definition.name);
        if (definition.desc) setting.setDesc(definition.desc);
        definition.render?.(setting, group);
      });
    };
    for (const definition of this.getSettingDefinitions()) {
      if ('type' in definition) {
        if (definition.type === 'group') {
          const group = new SettingGroup(container);
          if (definition.heading) group.setHeading(definition.heading);
          for (const item of definition.items ?? []) if (!('type' in item)) renderRow(item, group);
        }
      } else renderRow(definition, new SettingGroup(container));
    }
  }

  private appearanceControls(value: Appearance, type?: DiagramType): SettingDefinition[] {
    const t = this.plugin.t;
    const update = async (patch: Partial<Appearance>): Promise<void> => {
      const current = this.plugin.settings;
      await this.plugin.save(type
        ? { ...current, types: { ...current.types, [type]: { ...current.types[type], ...patch } } }
        : { ...current, defaults: { ...current.defaults, ...patch } });
    };
    const custom = value.useCustomColors ?? Object.values(value.colors ?? {}).some(colors => Object.keys(colors).length > 0);
    let paletteChoices: HTMLElement | undefined;
    const rows: SettingDefinition[] = [this.row('Color style', 'Distinguish components with colors, or use one hue throughout.', setting => {
      const choices = setting.controlEl.createDiv({ cls: 'mermaid-beauty-color-style', attr: { role: 'group', 'aria-label': t('Color style') } });
      for (const [name, label] of [['multi', 'Coordinated colors'], ['single', 'Single hue']] as const) {
        const button = choices.createEl('button', { text: t(label), attr: { type: 'button', 'aria-pressed': String(value.colorStyle === name) } });
        button.addEventListener('click', () => { void (async () => {
          await update({ colorStyle: name }); this.refreshSettings();
        })(); });
      }
    }), this.row('Color palette', value.colorStyle === 'multi'
      ? 'Soft fills, clear text and connectors. Colors distinguish components.' : 'One hue throughout, with clear text and connectors.', setting => {
      setting.setClass('mermaid-beauty-stacked');
      const choices = setting.controlEl.createDiv({ cls: 'mermaid-beauty-palettes', attr: { role: 'group', 'aria-label': t('Color palette') } });
      paletteChoices = choices;
      const selected = custom ? 'custom' : value.colorStyle === 'multi' ? value.multiPalette ?? 'clear' : value.palette;
      const darkPreview = setting.settingEl.ownerDocument.body.classList.contains('theme-dark');
      const palettes = value.colorStyle === 'multi' ? Object.entries(MULTICOLOR_PALETTES)
        : Object.entries({ sky: 'Clear blue', mint: 'Quiet teal', slate: 'Neutral gray', rose: 'Soft rose' });
      const captions: Record<string, UiText> = {
        clear: 'General · Clear groups', cool: 'Cool · Technical notes', natural: 'Soft · Long reads',
        sky: 'Blue · Simple and clear', mint: 'Teal · Calm and gentle', slate: 'Gray · Focus on content', rose: 'Rose · Warm and soft',
      };
      for (const [name, label] of palettes) {
        const button = choices.createEl('button', { cls: 'mermaid-beauty-palette-choice', attr: {
          type: 'button', 'aria-label': t('{name} palette', { name: t(label as UiText) }), 'aria-pressed': String(selected === name),
        } });
        const preview = paletteColors({ ...value, ...(value.colorStyle === 'multi' ? { multiPalette: name as MulticolorPaletteName }
          : { palette: name as PaletteName }), useCustomColors: false }, darkPreview);
        const swatches = button.createSpan({ cls: 'mermaid-beauty-swatches', attr: { 'aria-hidden': 'true' } });
        const colors = value.colorStyle === 'multi' ? componentPalette(preview, darkPreview) : { fills: [preview.surface], borders: [preview.border] };
        colors.fills.slice(0, 4).forEach((fill, index) => {
          const swatch = swatches.createSpan({ text: 'Aa' });
          swatch.style.setProperty('--mermaid-beauty-swatch', fill);
          swatch.style.setProperty('--mermaid-beauty-swatch-border', colors.borders[index]!);
          swatch.style.setProperty('--mermaid-beauty-swatch-text', preview.text);
        });
        const nameRow = button.createSpan({ cls: 'mermaid-beauty-palette-name' });
        nameRow.createSpan({ text: t(label as UiText) });
        nameRow.createSpan({ text: '✓', cls: 'mermaid-beauty-palette-check', attr: { 'aria-hidden': 'true' } });
        button.createSpan({ text: t(captions[name]!), cls: 'mermaid-beauty-palette-caption' });
        button.addEventListener('click', () => { void (async () => {
          this.customOpen = false;
          await update({ ...(value.colorStyle === 'multi' ? { multiPalette: name as MulticolorPaletteName }
            : { palette: name as PaletteName }), useCustomColors: false });
          this.refreshSettings();
        })(); });
      }
    }), this.row('Customize colors', undefined, setting => {
      setting.setClass('mermaid-beauty-custom'); setting.setClass('mermaid-beauty-stacked');
      const details = setting.controlEl.createEl('details'); details.open = this.customOpen;
      const summary = details.createEl('summary', { text: t(custom ? 'Custom colors (active)' : 'Customize colors') });
      const group = new SettingGroup(details);
      const markCustom = (): void => {
        if (!summary.isConnected) return;
        summary.setText(t('Custom colors (active)'));
        for (const button of paletteChoices?.querySelectorAll('button') ?? []) button.setAttribute('aria-pressed', 'false');
      };
      for (const definition of this.customColorControls({ ...value, useCustomColors: true }, update, type, markCustom)) {
        group.addSetting(control => {
          control.setName(definition.name);
          if (definition.desc) control.setDesc(definition.desc);
          definition.render?.(control, group);
        });
      }
      details.addEventListener('toggle', () => {
        if (!details.isConnected) return;
        this.customOpen = details.open;
      });
      setting.controlEl.createEl('p', { text: t('Colors follow the light or dark Obsidian theme.'), cls: 'mermaid-beauty-palette-caption' });
    })];
    for (const [key, name, description, min, max, step] of [
      ['fontSize', 'Font size', 'Text size in pixels.', 10, 28, 1],
      ['radius', 'Corner radius', 'Round the corners of supported rectangular nodes, in pixels. Semantic shapes stay unchanged.', 0, 24, 1],
      ['spacing', 'Graph spacing', 'Space between nodes and ranks, where supported by the layout. Larger values spread the diagram out.', 20, 120, 1],
      ['lineWidth', 'Line width', 'Connector thickness in pixels (0.5–6). Default: 1.1 px. Node borders and data-scaled chart bands keep their own widths.', 0.5, 6, 0.1],
    ] as const) {
      if (key === 'lineWidth' && type && !CONNECTORS[type]) continue;
      rows.push(this.row(name, description, setting => {
        setting.addSlider(slider => {
          const format = (number: number): string => key === 'lineWidth' ? `${Number(number.toFixed(1))}\u00a0px` : String(number);
          slider.setLimits(min, max, step).setValue(value[key]);
          if (requireApiVersion('1.13.0')) slider.setDisplayFormat(format);
          const legacyValue = !requireApiVersion('1.13.0') ? setting.controlEl.createSpan({ text: format(value[key]) }) : undefined;
          slider.onChange(async number => {
            if (number < min || number > max || !Number.isFinite(number)) return;
            legacyValue?.setText(format(number)); await update({ [key]: number });
          });
        });
      }));
    }
    if (!type || supportsGraphLayout(type)) rows.push(this.row('Graph layout',
      'Automatic uses ELK for supported relationship diagrams. Other types retain their specialized layout.', setting => {
        setting.addDropdown(dropdown => dropdown.addOptions({ auto: t('Automatic'), elk: 'ELK', dagre: 'Dagre' })
          .setValue(value.layout).onChange(async layout => update({ layout: layout as LayoutName })));
      }));
    rows.push(this.row('Fit available width', 'Shrink wide diagrams to fit the note. Turn off to allow horizontal scrolling.', setting => {
      setting.addToggle(toggle => toggle.setValue(value.fitWidth).onChange(async fitWidth => update({ fitWidth })));
    }));
    return rows;
  }

  private customColorControls(value: Appearance, update: (patch: Partial<Appearance>) => Promise<void>, type: DiagramType | undefined, onEdit: () => void): SettingDefinition[] {
    const t = this.plugin.t;
    const rows: SettingDefinition[] = [this.row('Edit theme', 'Edit light and dark colors separately. Rendering follows the Obsidian theme.', setting => {
      setting.addDropdown(dropdown => dropdown.addOptions({ light: t('Light mode'), dark: t('Dark mode') }).setValue(this.colorMode)
        .onChange(mode => { this.colorMode = mode as ColorMode; this.refreshSettings(); }));
    })];
    const mode = this.colorMode;
    const colors = paletteColors(value, mode === 'dark');
    for (const key of Object.keys(COLOR_FIELDS) as (keyof typeof COLOR_FIELDS)[]) {
      rows.push(this.row(COLOR_FIELDS[key], undefined, setting => {
        let picker: ColorComponent; let hex: TextComponent;
        const saveColor = async (input: string): Promise<void> => {
          const color = normalizeColor(input);
          hex.inputEl.setCustomValidity(color ? '' : t('Enter a hex color, such as #26845b.'));
          hex.inputEl.toggleClass('is-invalid', !color); hex.inputEl.setAttribute('aria-invalid', String(!color));
          if (!color) { hex.inputEl.reportValidity(); return; }
          picker.setValue(color); hex.setValue(color);
          const current = type ? this.plugin.settings.types[type] : this.plugin.settings.defaults;
          await update({ useCustomColors: true, colors: { ...current?.colors, [mode]: { ...current?.colors?.[mode], [key]: color } } });
          onEdit();
        };
        setting.addColorPicker(component => {
          picker = component; picker.setValue(colors[key]).onChange(color => { void saveColor(color); });
        }).addText(component => {
          hex = component; hex.setValue(colors[key]); hex.inputEl.addClass('mermaid-beauty-hex');
          hex.inputEl.setAttribute('aria-label', t('{name} hex color', { name: t(COLOR_FIELDS[key]) }));
          hex.inputEl.spellcheck = false;
          hex.inputEl.addEventListener('change', () => { void saveColor(hex.getValue()); });
        });
        setting.controlEl.querySelector('input[type="color"]')?.setAttribute('aria-label', t('{name} color', { name: t(COLOR_FIELDS[key]) }));
      }));
    }
    rows.push(this.row('Reset colors', 'Remove saved custom colors in both modes and return to the selected preset.', setting => {
      setting.addButton(button => button.setButtonText(t('Reset colors')).onClick(async () => {
        this.customOpen = false;
        await update({ colors: undefined, useCustomColors: false }); this.refreshSettings();
      }));
    }));
    return rows;
  }
}
