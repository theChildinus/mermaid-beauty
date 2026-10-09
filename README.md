# Mermaid Beauty

Make Mermaid diagrams in Obsidian easier to read with consistent colors, typography, lines, and layouts. Works with your existing `mermaid` code blocks; no source changes needed.

[中文说明](README.zh-CN.md)

## Features

- **Light and dark themes:** three complete coordinated palettes with soft fills and clear text, outlines, and connectors. Single-hue presets and custom colors remain available.
- **Coordinated colors or single hue:** distinguish nodes, participants, groups, and component roles in supported diagrams, or keep the original appearance. Flowchart colors follow source node IDs and stay stable when other nodes are inserted or reordered. Chart series retain their separate colors in either mode. Choose globally or by diagram type.
- **Adjustable appearance:** font size, line width, rectangular corner radius, spacing, and fit-to-width. Supported relationship diagrams use ELK layouts, with Dagre also available.
- **Settings by diagram type:** use shared defaults, choose a separate style, or keep the original renderer. Inheriting defaults keeps custom settings saved for switching back; only Reset removes them. Supports flowcharts, sequences, class diagrams, mind maps, charts, and more.
- **Local rendering:** bundles Mermaid, ELK, and ZenUML. No diagram uploads, telemetry, or renderer downloads. Images explicitly linked in a diagram may still need a network connection.
- **Chinese and English interface:** follows Obsidian's language or your preference.

## Install

Requires **Obsidian 1.12.7 or later**.

### Community plugins

Open **Settings → Community plugins → Browse**, search for **Mermaid Beauty**, then install and enable it. You can also open its [community listing](https://community.obsidian.md/plugins/mermaid-beauty).

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/theChildinus/mermaid-beauty/releases/latest).
2. Put all three files in `<vault>/.obsidian/plugins/mermaid-beauty/`.
3. Reload Obsidian and enable **Mermaid Beauty** under **Settings → Community plugins**.

Existing diagrams are styled automatically. Open **Settings → Mermaid Beauty** to choose colors and adjust their appearance. Explicit styles in diagram source take precedence. Disable other plugins that replace Mermaid's renderer if they conflict.

New installations use **Coordinated colors**. Upgrades keep the existing single-hue settings; switch under **Default appearance → Color style**. Custom node fills, borders, and text colors still take precedence. Select a preset palette to use automatic color separation.

Choose **Clear blue and teal**, **Cool tones**, or **Soft natural** from the palette cards. Each card shows actual fill, border, and text colors. Single-hue and coordinated modes remember their preset choices separately; the custom-color editor is collapsed until needed. Existing single-hue preset IDs and colors remain compatible with saved settings.

Nearby adjustments share one save; changing the interface language does not redraw diagrams in notes.

**Obsidian Sync Standard:** the bundled renderer is about 5.9 MB, exceeding its 5 MB per-file limit. Install the plugin separately on each device. Mobile behavior still needs device testing.

## Before and after

Both versions use the same [Mermaid source](tests/browser/readme-sources.ts). **Before** runs native Mermaid 11.13.0 independently with its default theme and layout; **After** uses Mermaid Beauty's Mint preset. Click the image to view it at full resolution.

### Order fulfillment · Flowchart

[![Flowchart before and after Mermaid Beauty](docs/images/flowchart-comparison.png)](docs/images/flowchart-comparison.png)

---

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_LICENSES.md)
