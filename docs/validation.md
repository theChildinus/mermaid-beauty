# Release validation

Validated on 2026-09-29 for version 1.1.0.

## Automated checks

- TypeScript, Obsidian ESLint rules, production build: passed.
- Unit tests: 31 passed, covering settings, renderer delegation, disposal, and orthogonal path geometry.
- Real browser: 78 light/dark renders and 15 behavior checks passed. The report includes the source hash and individual results: [validation-results.json](validation-results.json).
- Production dependencies remain unchanged. The pinned native Mermaid 11.13.0 development dependency reproduces the version bundled with Obsidian 1.13.7. It is used only for the fixed README examples, is excluded from the plugin bundle, and has known upstream advisories reported by `npm audit`.

Flowchart checks verify content-sized nodes, label padding measured before layout, single-line medium-length labels, rounded routes, open arrows, retained semantic shapes, explicit line breaks, Markdown emphasis, groups, and loops. All listed families are also checked in a 360px container.

Custom palettes are checked in light and dark modes across flowcharts, sequence diagrams, XY charts, and ZenUML. The checks cover each color role, per-type inheritance, source overrides, invalid saved colors, compatibility with existing presets, and retaining custom colors while a preset is selected.

The three README comparisons use the same English source on both sides and were inspected as exported JPEGs. SVG originals and regeneration code are included. The baseline runs unmodified Mermaid 11.13.0 in a separate iframe and a separate bundle without the plugin patch. The export checks the native default theme, Dagre layout, HTML labels, and identical source on both sides. JPEGs are browser captures so native HTML labels remain intact. The examples cover online shopping, ordering coffee, and library books.

## Obsidian integration

Obsidian 1.13.7 on macOS loaded the updated production bundle after disabling and re-enabling the plugin. The settings panel showed four preset cards and a Custom option, with Slate selected. Choosing Custom opened the color editors. A test node color survived switching to Sky and back to Custom, verified in the editor and saved settings. Reset colors cleared the test color, and the original Slate preset, font size 16, and corner radius 11 were restored. The earlier color-editor check also verified that changing node fill updated an existing flowchart in reading view.

The existing source note's SHA-256 stayed unchanged, and the installed files matched the build. Reading view, Live Preview, renderer toggling, and plugin unload were also exercised for 1.0.0; the integration check for 1.1.0 focused on color editing, persistence, rendering, and reset.

The test vault also had Codeblock Customizer, Iconic, and Mermaid Zoom enabled. Mermaid Zoom controls remained available. This is a compatibility observation for these installed versions, not a guarantee for other plugin combinations.

## Remaining limits

Live Preview can cache a widget after an appearance change; switching reading/editing mode refreshes it. Mobile devices and older supported Obsidian versions have not been exercised. No pixel-for-pixel equivalence with Codex is claimed.
