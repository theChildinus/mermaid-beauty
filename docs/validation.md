# Release validation

Validated on 2026-09-29 for version 1.2.0.

## Automated checks

- TypeScript, Obsidian ESLint rules, production build: passed.
- Unit tests: 44 passed, covering settings, renderer delegation, disposal, and orthogonal path geometry.
- Real browser: 78 light/dark renders and 40 behavior checks passed. The report includes the source hash and individual results: [validation-results.json](validation-results.json).
- Production dependencies remain unchanged. The pinned native Mermaid 11.13.0 development dependency reproduces the version bundled with Obsidian 1.13.7. It is used only for the fixed README examples, is excluded from the plugin bundle, and has known upstream advisories reported by `npm audit`.

Flowchart checks verify content-sized nodes, label padding measured before layout, single-line medium-length labels, rounded routes, open arrows, retained semantic shapes, explicit line breaks, Markdown emphasis, groups, and loops. All listed families are also checked in a 360px container.

Custom palettes are checked in light and dark modes across flowcharts, sequence diagrams, XY charts, and ZenUML. The checks cover each color role, per-type inheritance, source overrides, invalid saved colors, compatibility with existing presets, and retaining custom colors while a preset is selected.

The unchanged README comparisons from 1.1.0 use the same English source on both sides and were inspected as exported JPEGs for 1.1.0. SVG originals and regeneration code are included. The baseline runs unmodified Mermaid 11.13.0 in a separate iframe and a separate bundle without the plugin patch. The export checks the native default theme, Dagre layout, HTML labels, and identical source on both sides. JPEGs are browser captures so native HTML labels remain intact. The examples cover online shopping, ordering coffee, and library books.

Connector widths were checked in light and dark modes for all 21 supported connection families. Separate checks verify per-type inheritance, zero preserving previous defaults, explicit source widths, thick/dashed/invisible edge semantics, and unchanged node borders, chart axes, and Sankey bands. Default, 3px, and 6px examples were visually checked at the normal preview width and in 360px containers. Wardley does not consume Mermaid theme CSS, so the plugin applies SVG-scoped connector styles after rendering.

Language tests cover Chinese locale variants, English fallback, explicit selection, persistence, and translated JSON validation errors without changing Mermaid configuration keys.

## Obsidian integration

Obsidian 1.13.7 on macOS loaded the 1.2.0 production bundle after disabling and re-enabling the plugin. Follow Obsidian displayed Chinese settings. Selecting English immediately translated setting names, descriptions, palette choices, and both command names. Returning to Follow Obsidian restored Chinese; the command palette contained the two translated commands without duplicate English entries.

Changing the global line width to 3px made connections in an existing flowchart visibly thicker. The setting persisted when reopening the panel. Restoring 0 preserved the previous rendering defaults. After a plugin reload, Chinese settings, the saved default width, and the original Sky palette, font size 16, radius 11, spacing 48, automatic layout, and fit-width setting remained intact. The existing note's SHA-256 stayed unchanged, and the installed plugin files matched the production build.

The test vault had Codeblock Customizer, Iconic, and Mermaid Zoom enabled. Mermaid Zoom controls remained available. This is an observation for these installed versions, not a guarantee for other plugin combinations. Reading view, Live Preview, and renderer unload were exercised during 1.0.0 validation; this update's Obsidian check focused on language, commands, line width, persistence, and reloading.

## Remaining limits

Live Preview can cache a widget after an appearance change; switching reading/editing mode refreshes it. Mobile devices and older supported Obsidian versions have not been exercised. No pixel-for-pixel equivalence with Codex is claimed.
