# Release validation

Validated on 2026-09-29 for version 1.0.0.

## Automated checks

- TypeScript, Obsidian ESLint rules, production build: passed.
- Unit tests: 22 passed, covering settings, renderer delegation, disposal, and orthogonal path geometry.
- Real browser: 78 light/dark renders and 12 behavior checks passed. The report includes the source hash and individual results: [validation-results.json](validation-results.json).
- Dependencies: npm audit reported no vulnerabilities when dependencies were installed.

Flowchart checks verify content-sized nodes, label padding measured before layout, single-line medium-length labels, rounded routes, open arrows, retained semantic shapes, explicit line breaks, Markdown emphasis, groups, and loops. All listed families are also checked in a 360px container.

## Obsidian integration

Obsidian 1.13.7 on macOS loaded the production bundle. An existing diagram displayed the updated routes, card sizes and labels in reading view and rendered in Live Preview. Toggling enhancement restored the preceding renderer in reading view. Disabling and re-enabling the plugin loaded the updated bundle. The source note's SHA-256 stayed unchanged. The installed bundle matched the build's SHA-256.

The test vault also had Codeblock Customizer, Iconic, and Mermaid Zoom enabled. Mermaid Zoom controls remained available. This is a compatibility observation for these installed versions, not a guarantee for other plugin combinations.

## Remaining limits

Live Preview can cache a widget after an appearance change; switching reading/editing mode refreshes it. Mobile devices and older supported Obsidian versions have not been exercised. No pixel-for-pixel equivalence with Codex is claimed.
