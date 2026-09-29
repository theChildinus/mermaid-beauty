# Mermaid Beauty

An Obsidian plugin that renders existing Mermaid blocks with a shared visual theme and per-type controls.

- Keep production code independent of the preview harness.
- Bundle the complete Mermaid engine. Do not download scripts or diagram source at runtime.
- Preserve diagram semantics, explicit source configuration, native opt-outs, and plugin unload behavior.
- Rendering changes require the browser fixture check as well as unit tests.
- Run `npm run check` and `npm run test:render` before a release.
- Release `main.js`, `manifest.json`, and `styles.css` together; the release tag must match the manifest version exactly.
- Never include vault contents or proprietary example diagrams in the public repository.
