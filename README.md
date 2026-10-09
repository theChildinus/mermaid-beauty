# Mermaid Beauty

Clearer Mermaid diagrams in Obsidian. Works with your existing `mermaid` blocks, without editing the source.

[中文说明](README.zh-CN.md)

![The same request-review flowchart before and after Mermaid Beauty: default purple nodes before, coordinated colors and rounded connectors after.](docs/images/flowchart-comparison.png)

Both use the **[same source](tests/browser/readme-sources.ts)**. After uses the default Clear blue and teal palette, rounded connectors, and outlined labels. [View the vertical comparison for narrow screens](docs/images/flowchart-comparison-stacked.png).

## Install

Requires **Obsidian 1.12.7+**. Open **Settings → Community plugins → Browse**, search for **Mermaid Beauty**, then install and enable it. [Community listing](https://community.obsidian.md/plugins/mermaid-beauty)

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/theChildinus/mermaid-beauty/releases/latest).
2. Put all three files in `<vault>/.obsidian/plugins/mermaid-beauty/`.
3. Reload Obsidian and enable **Mermaid Beauty**.

## Adjust the appearance

Open **Settings → Mermaid Beauty**:

- **Colors:** three coordinated palettes, single-hue presets, or custom colors. Follows Obsidian's light or dark theme.
- **Size and layout:** adjust text size, connector width, corners, spacing, and fit-to-width.
- **Per diagram type:** share defaults, use a separate style, or keep native rendering. Supports flowcharts, sequences, class diagrams, mind maps, charts, and more.

New installations use coordinated colors. Upgrades keep your existing appearance; choose **Default appearance → Color style → Coordinated colors** to try it.

## Notes

- Rendering runs locally. Diagram text is not uploaded; images linked in the source may need a network connection.
- Explicit source styles take precedence. If another plugin also replaces Mermaid rendering, disable one of them if they conflict.
- The bundled renderer is about **5.9 MB**, above Obsidian Sync Standard's 5 MB file limit. Install separately on each device. Mobile devices have not been tested.

[MIT License](LICENSE) · [Third-party notices](THIRD_PARTY_LICENSES.md)
