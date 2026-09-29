# Changelog

## 1.0.0

Initial release of Mermaid Beauty for Obsidian.

- Enhance every diagram family supported by the bundled Mermaid 12.0.0 and ZenUML engines by default.
- Choose shared or per-type palettes, font size, corner radius, spacing, layout, and width behavior. Opt individual types out of enhanced rendering.
- Render flowcharts with content-sized cards, capsule labels measured before layout, smooth orthogonal corners, and open arrowheads.
- Preserve semantic shapes, explicit diagram styles, and source text. Fall back to the existing renderer if enhancement fails.

Checked with 22 unit tests, 78 browser renders, and 12 behavior checks. Reading view, Live Preview, renderer toggling, and plugin reload were checked in Obsidian 1.13.7 on macOS. Mobile device testing is pending. Cached Live Preview diagrams may need a reading/editing mode switch after settings change.
