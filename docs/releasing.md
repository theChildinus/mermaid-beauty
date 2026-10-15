# Publishing Mermaid Beauty

The release consists of the public source repository, a GitHub release, and the Obsidian community directory entry. The first release requires a directory submission; later versions update the existing entry. Directory acceptance and review are separate statuses from publishing a GitHub release.

## Prepare

1. Keep `package.json`, `manifest.json`, and `versions.json` consistent.
2. Run `npm run check`.
3. Run `npm run dev:preview`, open the local preview, and press **Run rendering checks**. Inspect the flowchart, other changed families, and the narrow preview.
4. Run `npm run test:render` and `node scripts/package-release.mjs`.
5. Test the three built files in Obsidian and check that notes remain unchanged.

For onboarding and export changes, check first enablement, the native Mermaid permission, Reading view and Live Preview refresh, one and multiple diagrams, PNG clipboard denial, attachment naming, and plugin unload. Browser export tests use real SVG/PNG encoding and a small host stub for controls; unit tests mock clipboard and vault writes. They do not replace Obsidian or physical-device checks. Follow the mobile matrix in [usage.md](usage.md).

To regenerate the showcase, click **Export README comparisons** in the preview. The three public sources are in `tests/browser/readme-sources.ts` and reproduced in [examples.md](examples.md). Keep both in sync. Then run `python3 scripts/make-demo.py` with Pillow installed to generate the 15-second GIF. Set `MERMAID_BEAUTY_PREVIEW_DIR` consistently if using a separate preview directory. Inspect the wide and stacked images, Chinese labels, and dark theme before committing them.

The Mermaid version is pinned because the flowchart adapter uses its bundled ELK module. Checked build patches capture Mermaid’s parsed flowchart graph for automatic color grouping and measure label backgrounds before layout. Mermaid upgrades require reviewing `src/mermaid-internals.d.ts` and `scripts/mermaid-layout-patch.mjs`, then rerunning the complete browser suite.

## GitHub release

Use the repository `theChildinus/mermaid-beauty`. Publish the source with README, manifest, MIT license, third-party notices, and build instructions on the default branch. Create a tag matching `manifest.json` exactly, without a `v` prefix, for the reviewed commit.

Attach `main.js`, `manifest.json`, and `styles.css` from `dist/<version>/` to the release. Keep `SHA256SUMS` for local verification; it is not a supported plugin release asset. The JavaScript includes bundled third-party notices. Read back the branch/tag and download asset hashes before marking the release delivered.

## Community directory

Follow the [official submission guide](https://docs.obsidian.md/plugins/releasing/submit-plugin) and [account setup guide](https://docs.obsidian.md/community-directory/set-up-and-claim).

Sign in at [Obsidian Community](https://community.obsidian.md/), link the GitHub owner profile, and add the public repository URL. Review the [developer policies](https://docs.obsidian.md/community-directory/developer-policies) and [plugin requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins) before accepting terms and submitting. Address review findings in a new release. Mark the plugin listed only after its published directory entry is visible.

For an already listed plugin, publish the new GitHub release without resubmitting the entry. In the plugin's account page, use **Check for new releases** if the directory has not picked it up yet. Verify the displayed version and the review for its commit separately. See [Manage your plugin or theme](https://docs.obsidian.md/community-directory/manage-entry).

## Review fixes and provenance

The build adapter in `scripts/zenuml-svg-build.mjs` compiles the original SVG entry from the source maps included in the locked `@zenuml/core` 3.50.1 npm package. It uses the upstream parser, layout, SVG components, and icons unchanged. This excludes the React editor's script creation, remote CSS loader, and storage access. The adapter fails on an unreviewed version or missing source; no runtime network load is introduced. The production build checks for script creation, storage access, and React editor dependencies.

Run **Attest release build** on the approved release ref in GitHub Actions. Download its three release files, compare their hashes with the locally verified build, and use those exact files for the release. This records GitHub build provenance for the artifact hashes. Adding the workflow alone does not create attestations.

Publish only after reviewing the test results and remaining warnings in [validation.md](validation.md). A successful local check does not confirm marketplace acceptance. Check the new commit's review result in the community dashboard after submission.

Browser fixtures and preview tools live in `tests/browser`, which the [official scanner configuration](https://github.com/obsidianmd/eslint-plugin/blob/master/docs/configuration.md#community-plugin-scanner-configuration) excludes from plugin-source scanning. Local lint and browser checks still cover them. The build rejects test imports in the production dependency graph. Do not move runtime code into test directories to avoid review.
