# Changelog

## 1.5.1

- Keep small fit-to-width diagrams at their natural size in print and PDF exports while still shrinking diagrams wider than the page.

## 1.5.0

- Add a one-time welcome notice and a bilingual getting-started guide, including Obsidian's native Mermaid permission and refresh steps.
- Refresh cached Live Preview widgets through the host's Markdown post-processor event, without editing note text or undo history.
- Copy enhanced diagrams as PNG or SVG images, or export PNG/SVG files; keep colors, labels, geometry, and rounded corners in the exported image. Pasting a copied SVG in Obsidian creates a vector attachment and embeds it in the receiving note. Order the menu as Copy as SVG, Copy as PNG, Export as SVG, and Export as PNG, with a separator between copy and export. Desktop exports open the system save dialog, starting in the attachment folder and remembering the last successful location. Completion feedback includes Show in folder. Cancelling writes no image; mobile exports continue to use the configured attachment folder.
- Add persistent 44-pixel export controls on touch screens and bounded PNG dimensions to limit canvas memory.
- Label the compact icon Copy and export and place it inside each diagram's bottom-left corner, without adding a row. Keep it fixed while scrolling and separate from Mermaid Zoom's bottom-right controls and drag gestures.
- Clean up export controls and observers in cached notes when the plugin is disabled, preventing stale actions after a reload.
- Add three reproducible public examples, a 15-second before/after demo, and cross-device setup instructions. The complete offline engine remains bundled.

## 1.4.1

- Align ordinary flowchart cards at equal widths within the same group and layout layer, including nested groups and all four flow directions.
- Straighten small connector jogs when the new route and label placement avoid nodes, labels, and additional line conflicts. Keep necessary detours and feedback routes.
- Preserve automatic color grouping, semantic shapes, authored sizes and styles, and explicit layout choices.
- Refresh the README comparison with the same release workflow before and after automatic layout improvements.

## 1.2.0

- Set connector width globally or per diagram type. Zero preserves existing widths; manual widths range from 0.1 to 6 pixels. Node borders, chart axes, and quantity-scaled bands remain unchanged.
- Choose Chinese, English, or Follow Obsidian for settings, commands, and notices. Diagram source and labels stay unchanged.
- Explain font size, corner radius, and graph spacing directly in the settings panel.

Existing appearance and custom colors are preserved when upgrading. Checked with 44 unit tests, 78 browser renders, and 40 behavior checks. Language switching, command names, line-width changes, saved settings, and plugin reloading were verified in Obsidian 1.13.7 on macOS.

## 1.1.0

- Customize background, node, label, text, border, connector, and accent colors with pickers or hex values. Light and dark modes can use different colors, globally or per diagram type.
- Choose Mint, Slate, Sky, or Rose from color preview cards. Switch to Custom to edit colors; switching presets keeps those custom values saved.
- Show English examples for shopping, ordering coffee, and library books. Before images use native Mermaid 11.13.0 defaults; After images use Mermaid Beauty with the same source.

Existing settings are preserved. Checked with 31 unit tests, 78 browser renders, and 15 behavior checks. Preset selection, custom editing, and restoring saved colors were verified in Obsidian 1.13.7 on macOS.

## 1.0.0

Initial release of Mermaid Beauty for Obsidian.

- Enhance every diagram family supported by the bundled Mermaid 12.0.0 and ZenUML engines by default.
- Choose shared or per-type palettes, font size, corner radius, spacing, layout, and width behavior. Opt individual types out of enhanced rendering.
- Render flowcharts with content-sized cards, capsule labels measured before layout, smooth orthogonal corners, and open arrowheads.
- Preserve semantic shapes, explicit diagram styles, and source text. Fall back to the existing renderer if enhancement fails.

Checked with 22 unit tests, 78 browser renders, and 12 behavior checks. Reading view, Live Preview, renderer toggling, and plugin reload were checked in Obsidian 1.13.7 on macOS. Mobile device testing is pending. Cached Live Preview diagrams may need a reading/editing mode switch after settings change.
