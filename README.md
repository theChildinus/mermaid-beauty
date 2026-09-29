# Mermaid Beauty

Make Mermaid diagrams in Obsidian easier to read with consistent colors, typography, lines, and layouts. Works with your existing `mermaid` code blocks; no source changes needed.

[中文说明](README.zh-CN.md)

## Features

- **Light and dark themes:** Mint, Slate, Sky, and Rose presets, plus custom colors for text, nodes, outlines, and connectors.
- **Adjustable appearance:** font size, line width, rectangular corner radius, spacing, and fit-to-width. Supported relationship diagrams use ELK layouts, with Dagre also available.
- **Settings by diagram type:** use shared defaults, choose a separate style, or keep the original renderer. Supports flowcharts, sequences, class diagrams, mind maps, charts, and more.
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

**Obsidian Sync Standard:** the bundled renderer is about 5.9 MB, exceeding its 5 MB per-file limit. Install the plugin separately on each device. Mobile behavior still needs device testing.

## Before and after

Both versions use the same [Mermaid source](tests/browser/readme-sources.ts). **Before** runs native Mermaid 11.13.0 independently with its default theme and layout; **After** uses Mermaid Beauty's Mint preset. Click the image to view it at full resolution.

### Order fulfillment · Flowchart

[![Flowchart before and after Mermaid Beauty](docs/images/flowchart-comparison.png)](docs/images/flowchart-comparison.png)

---

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_LICENSES.md)
