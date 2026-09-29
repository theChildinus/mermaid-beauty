# Release validation

Validated on 2026-09-29 for version 1.2.0.

## Automated checks

- TypeScript and production build: passed. ESLint covers both `src` and `dev`: zero errors; remaining warnings are browser DOM/fetch calls in the standalone preview.
- Unit tests: 48 passed, covering settings, renderer delegation, disposal, and orthogonal path geometry.
- Real browser: 80 light/dark renders and 40 behavior checks passed. The report includes the source hash and individual results: [validation-results.json](validation-results.json).
- Production dependencies remain unchanged. The pinned native Mermaid 11.13.0 development dependency reproduces the version bundled with Obsidian 1.13.7. It is used only for the fixed README examples, is excluded from the plugin bundle, and has known upstream advisories reported by `npm audit`.

Flowchart checks verify content-sized nodes, label padding measured before layout, single-line medium-length labels, rounded routes, open arrows, retained semantic shapes, explicit line breaks, Markdown emphasis, groups, and loops. All listed families are also checked in a 360px container.

Custom palettes are checked in light and dark modes across flowcharts, sequence diagrams, XY charts, and ZenUML. The checks cover each color role, per-type inheritance, source overrides, invalid saved colors, compatibility with existing presets, and retaining custom colors while a preset is selected.

The unchanged README comparisons from 1.1.0 use the same English source on both sides and were inspected as exported JPEGs for 1.1.0. SVG originals and regeneration code are included. The baseline runs unmodified Mermaid 11.13.0 in a separate iframe and a separate bundle without the plugin patch. The export sets native default theme, Dagre layout, and HTML labels explicitly, and checks identical source on both sides. The updated export path also completed for all three examples during this review fix; the published 1.1.0 images are retained. JPEGs are browser captures so native HTML labels remain intact. The examples cover online shopping, ordering coffee, and library books.

Connector widths were checked in light and dark modes for all 21 supported connection families. Separate checks verify per-type inheritance, positive defaults, minimum 0.5px, migration of saved zero values, explicit source widths, thick/dashed/invisible edge semantics, and unchanged node borders, chart axes, and Sankey bands. 1.1px, 3px, and 6px examples were visually checked at the normal preview width and in 360px containers. Wardley does not consume Mermaid theme CSS, so the plugin applies SVG-scoped connector styles after rendering.

Language tests cover Chinese locale variants, English fallback, explicit selection, persistence, and translated JSON validation errors without changing Mermaid configuration keys.

## Obsidian integration

Obsidian 1.13.7 on macOS loaded the 1.2.0 production bundle after disabling and re-enabling the plugin. Follow Obsidian displayed Chinese settings. Selecting English immediately translated setting names, descriptions, palette choices, and both command names. Returning to Follow Obsidian restored Chinese; the command palette contained the two translated commands without duplicate English entries.

Changing the global line width to 3px made connections in an existing flowchart visibly thicker. The setting persisted when reopening the panel. The revised control displays an actual pixel value: default 1.1px, minimum 0.5px. Decrementing at 0.5px stayed at 0.5px. The saved user value 1.5px was restored after testing. After a plugin reload, Chinese settings, the saved width, and the original Sky palette, font size 16, radius 11, spacing 48, automatic layout, and fit-width setting remained intact. The existing note's SHA-256 stayed unchanged, and the installed plugin files matched the production build.

The test vault had Codeblock Customizer, Iconic, and Mermaid Zoom enabled. Mermaid Zoom controls remained available. This is an observation for these installed versions, not a guarantee for other plugin combinations. Reading view, Live Preview, and renderer unload were exercised during 1.0.0 validation; this update's Obsidian check focused on language, commands, line width, persistence, and reloading.

## Marketplace review fixes

The failed marketplace review covered release 1.1.0 at `1d8eb61`. This local 1.2.0 candidate removes all five reported errors: four static style assignments in the preview and the runtime script-creation finding in the bundled ZenUML editor.

The ZenUML SVG entry is rebuilt from the unchanged sources in its locked npm package, including parser, positioning, SVG primitives, and icons. The React editor, its external CSS loader, and browser storage code are excluded. The production build rejects script-element creation, browser storage access, and React editor dependencies. All ZenUML fixtures passed in light and dark mode, including nested calls, returns, conditionals, loops, and actor/database icons.

Settings now expose named definitions for Obsidian search. Searching for the Chinese line-width label found the setting in Obsidian 1.13.7. Calls to the new settings and slider APIs are guarded by `requireApiVersion('1.13.0')`; older hosts use the same definitions with imperative rendering. The previous deprecated display refresh, dynamic tooltip, and native-preview API calls are removed. The CSS `!important` override is removed.

The build is minified with esbuild and retains third-party licenses. Only the three supported plugin assets will be attached to a release. A manually triggered GitHub Actions workflow has been prepared for build attestations; no attestation exists until that workflow is run and the exact resulting files are published.

The candidate has not been submitted for a new marketplace review. Local validation does not establish acceptance.

## Remaining limits

Live Preview can cache a widget after an appearance change; switching reading/editing mode refreshes it. Mobile devices and older supported Obsidian versions have not been exercised. No pixel-for-pixel equivalence with Codex is claimed.

The complete diagram bundle is 5,911,379 bytes, down from 15,999,179 bytes in 1.1.0, and remains above the marketplace's 5MB Obsidian Sync Standard warning threshold. Browser preview DOM/fetch warnings are retained because these pages run outside Obsidian and are excluded from `main.js`. The scoped `.mermaid:has(> .mermaid-beauty-diagram)` selector is retained to allow horizontal scrolling without changing native diagrams; it may still receive a CSS advisory. These are separate from the five errors fixed above.
