# Contributing

Use Node.js 22.12 or newer and install dependencies with `npm ci`.

Run `npm run check` for TypeScript, unit tests, lint, and the production build. Rendering changes also need `npm run dev:preview`: open the printed localhost URL, press **Run rendering checks**, and inspect the changed diagrams at normal and narrow widths. Then run `npm run test:render` to verify that the report matches the current source.

Keep diagram source editable, preserve explicit styles and semantic shapes, and test native opt-outs and plugin unload. Use public, generic examples in fixtures and screenshots; do not commit vault contents.

The standalone browser previews use DOM and fetch APIs because they run outside Obsidian. Only `tests/browser/**/*.ts` is exempt from the Obsidian DOM-helper and request-API rules; all other lint rules still run. The production build rejects imports from `dev` and `tests`, so these browser calls cannot enter the plugin artifact. Both source and preview lint must pass without warnings.

See [publishing](docs/releasing.md) for packaging and marketplace review. Dependency upgrades need the full browser suite, including the ZenUML SVG adapter checks.
