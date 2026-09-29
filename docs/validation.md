# Release validation

Version 1.2.2 candidate, checked on 2026-09-29. GitHub publication and the community directory review are pending.

## 1.2.2 checks

- `npm run check`: TypeScript, 82 unit tests, lint with zero warnings, and the production build passed.
- `npm run test:render`: 80 fixture renders and 555 behavior checks passed in the browser. [validation-results.json](validation-results.json) records the results and source hash `7098443a76f50f6c928c92429946b5897e90b05036c71c46c027657ebad23e60`.
- The 165 Zoom checks cover every fixture, including complex sequences, both light/dark modes, fit-width on/off, 320/900 px containers, and 25%/100%/300% scaling. They verify dimensions, strokes, arrows, explicit source styles, native SVG isolation, and unchanged inline diagrams.
- Zoom compatibility now applies to all Beauty-enhanced diagram types. The SVG clone uses its viewBox dimensions so strokes and arrowheads scale with the rest of the diagram. These browser checks reproduce Zoom 1.7's cloning behavior; they do not constitute mobile-device testing.
- English and Chinese READMEs now focus on features and installation, with one 3600 px PNG flowchart comparison. Both sides use the same source; native Mermaid 11.13.0 runs in a separate iframe and bundle without the plugin patch.
- `npm audit --omit=dev`: zero reported vulnerabilities. `main.js` is 5,921,580 bytes; the Obsidian Sync Standard 5 MB file limit still applies.

The local release files are in `dist/1.2.2/`, with SHA-256 hashes in `SHA256SUMS`. The minimum supported Obsidian version remains 1.12.7. This release has not been installed into the local vault during these checks.

## 1.2.1 historical validation

Release 1.2.1 was published on 2026-09-29. The community review completed with verified attestations, a byte-for-byte reproducible build, no vulnerable dependencies, and the remaining 5 MB bundle-size warning.

### 1.2.1 checks

- `npm run check`: TypeScript, 82 unit tests, production build, and lint passed. Production source and browser tests both have zero lint errors or warnings.
- Real browser: 80 fixture renders and 392 behavior checks passed. The 1.2.1 tag retains its report with source hash `5a45d76d21b3d954107c4a3de30aaeab009197f0648ae1724ef96ca6551d9c7e`.
- The matrix covers all 34 diagram families, four presets, and both light/dark modes. Checks measure text contrast against the actual fills, main outlines and connections, circle/ellipse label alignment at 10/15/28 px, and 1000/360 px containers. Explicit styles, source configuration, native opt-outs, failure recovery, and unload checks pass.
- Dedicated regressions cover Mermaid Zoom's sequence cloning/scaling, filled labels, Kanban wrapping and geometry, C4 relationships, Timeline connectors, Sankey band ratios/blending, and Event modeling's HTML labels.
- `npm audit --omit=dev`: zero reported vulnerabilities. The full offline Mermaid engine, ELK, and ZenUML remain bundled.

The three local plugin assets match `dist/1.2.1/`. Obsidian 1.13.7 loaded the new build after toggling Beauty off/on and showed version 1.2.1 after refreshing its plugin list. Chinese settings retained Sky, font size 16, radius 11, spacing 48, automatic layout, fit-width, and line width 1.5 px. This runtime check covers loading and settings; the full diagram matrix was exercised in the browser. Beauty's settings file and all four Mermaid Zoom files stayed byte-for-byte unchanged.

### 1.2.1 review changes

Production code creates missing SVG stylesheets through Obsidian's `createSvg`. Horizontal scrolling uses an explicit container class instead of `:has`; switching to native rendering, errors, unload, and late binding callbacks clear or preserve that class as appropriate.

The standalone browser harness now lives in `tests/browser`. The [official scanner configuration](https://github.com/obsidianmd/eslint-plugin/blob/master/docs/configuration.md#community-plugin-scanner-configuration) excludes test directories from plugin-source scanning. These tools still run in local lint and browser checks. Only their Obsidian DOM-helper and request-API lint rules are adjusted, because ordinary browsers do not provide those APIs. Production rules remain enabled, and the build rejects imports from test or preview code. This source-layout correction was accepted by the 1.2.1 marketplace review.

`main.js` is 5,921,564 bytes, above the marketplace's 5 MB Obsidian Sync Standard threshold. That warning remains applicable. The README and release notes disclose the per-file sync limit. No diagram families, ELK layouts, or offline support were removed.

## 1.2.0 historical validation

The following records the released 1.2.0 checks; its older counts do not describe the 1.2.1 suite.

### Automated checks

- TypeScript and production build: passed. ESLint covers both `src` and `dev`: zero errors; remaining warnings are browser DOM/fetch calls in the standalone preview.
- Unit tests: 48 passed, covering settings, renderer delegation, disposal, and orthogonal path geometry.
- Real browser: 80 light/dark renders and 40 behavior checks passed. The 1.2.0 report remains available in the 1.2.0 Git tag.
- Production dependencies remain unchanged. The pinned native Mermaid 11.13.0 development dependency reproduces the version bundled with Obsidian 1.13.7. It is used only for the fixed README examples, is excluded from the plugin bundle, and has known upstream advisories reported by `npm audit`.

Flowchart checks verify content-sized nodes, label padding measured before layout, single-line medium-length labels, rounded routes, open arrows, retained semantic shapes, explicit line breaks, Markdown emphasis, groups, and loops. All listed families are also checked in a 360px container.

Custom palettes are checked in light and dark modes across flowcharts, sequence diagrams, XY charts, and ZenUML. The checks cover each color role, per-type inheritance, source overrides, invalid saved colors, compatibility with existing presets, and retaining custom colors while a preset is selected.

The unchanged README comparisons from 1.1.0 use the same English source on both sides and were inspected as exported JPEGs for 1.1.0. SVG originals and regeneration code are included. The baseline runs unmodified Mermaid 11.13.0 in a separate iframe and a separate bundle without the plugin patch. The export sets native default theme, Dagre layout, and HTML labels explicitly, and checks identical source on both sides. The updated export path also completed for all three examples during this review fix; the published 1.1.0 images are retained. JPEGs are browser captures so native HTML labels remain intact. The examples cover online shopping, ordering coffee, and library books.

Connector widths were checked in light and dark modes for all 21 supported connection families. Separate checks verify per-type inheritance, positive defaults, minimum 0.5px, migration of saved zero values, explicit source widths, thick/dashed/invisible edge semantics, and unchanged node borders, chart axes, and Sankey bands. 1.1px, 3px, and 6px examples were visually checked at the normal preview width and in 360px containers. Wardley does not consume Mermaid theme CSS, so the plugin applies SVG-scoped connector styles after rendering.

Language tests cover Chinese locale variants, English fallback, explicit selection, persistence, and translated JSON validation errors without changing Mermaid configuration keys.

### Obsidian integration

Obsidian 1.13.7 on macOS loaded the 1.2.0 production bundle after disabling and re-enabling the plugin. Follow Obsidian displayed Chinese settings. Selecting English immediately translated setting names, descriptions, palette choices, and both command names. Returning to Follow Obsidian restored Chinese; the command palette contained the two translated commands without duplicate English entries.

Changing the global line width to 3px made connections in an existing flowchart visibly thicker. The setting persisted when reopening the panel. The revised control displays an actual pixel value: default 1.1px, minimum 0.5px. Decrementing at 0.5px stayed at 0.5px. The saved user value 1.5px was restored after testing. After a plugin reload, Chinese settings, the saved width, and the original Sky palette, font size 16, radius 11, spacing 48, automatic layout, and fit-width setting remained intact. The existing note's SHA-256 stayed unchanged, and the installed plugin files matched the production build.

The test vault had Codeblock Customizer, Iconic, and Mermaid Zoom enabled. Mermaid Zoom controls remained available. This is an observation for these installed versions, not a guarantee for other plugin combinations. Reading view, Live Preview, and renderer unload were exercised during 1.0.0 validation; this update's Obsidian check focused on language, commands, line width, persistence, and reloading.

### Marketplace review fixes

The failed marketplace review covered release 1.1.0 at `1d8eb61`. This local 1.2.0 candidate removes all five reported errors: four static style assignments in the preview and the runtime script-creation finding in the bundled ZenUML editor.

The ZenUML SVG entry is rebuilt from the unchanged sources in its locked npm package, including parser, positioning, SVG primitives, and icons. The React editor, its external CSS loader, and browser storage code are excluded. The production build rejects script-element creation, browser storage access, and React editor dependencies. All ZenUML fixtures passed in light and dark mode, including nested calls, returns, conditionals, loops, and actor/database icons.

Settings now expose named definitions for Obsidian search. Searching for the Chinese line-width label found the setting in Obsidian 1.13.7. Calls to the new settings and slider APIs are guarded by `requireApiVersion('1.13.0')`; older hosts use the same definitions with imperative rendering. The previous deprecated display refresh, dynamic tooltip, and native-preview API calls are removed. The CSS `!important` override is removed.

The build is minified with esbuild and retains third-party licenses. Release 1.2.0 includes only the three supported plugin assets. GitHub Actions built and attested those files; their hashes matched the local build and the downloaded release assets.

The community directory review for 1.2.0 at `07476f9` completed on 2026-09-29. It verified artifact attestations, found no vulnerable production dependencies, and reproduced `main.js` byte for byte. Its Review score remains Caution: 28 warnings in the standalone browser tools, one production DOM-helper warning, one CSS `:has` warning, and the bundle-size warning.

## Remaining limits

Live Preview can cache a widget after an appearance change; switching reading/editing mode refreshes it. Mobile devices and older supported Obsidian versions have not been exercised. No pixel-for-pixel equivalence with Codex is claimed.

The released 1.2.0 bundle is 5,911,379 bytes, down from 15,999,179 bytes in 1.1.0. The 1.2.1 size and Sync limit are recorded above. A second minifier saved only about 90 KB in a local experiment and was not added. No diagram family, ELK layout, or offline rendering support was removed to reduce the size.
