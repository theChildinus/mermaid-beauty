# Publishing Mermaid Beauty

The release consists of the public source repository, a GitHub release, and an Obsidian community directory submission. Directory acceptance is a separate status from publishing a GitHub release.

## Prepare

1. Keep `package.json`, `manifest.json`, and `versions.json` consistent.
2. Run `npm run check`.
3. Run `npm run dev:preview`, open the local preview, and press **Run rendering checks**. Inspect the flowchart, other changed families, and the narrow preview.
4. Run `npm run test:render` and `node scripts/package-release.mjs`.
5. Test the three built files in Obsidian and check that notes remain unchanged.

The Mermaid version is pinned because the flowchart adapter uses its bundled ELK module. A checked build patch widens edge labels and accounts for capsule padding before layout. Mermaid upgrades require reviewing `src/mermaid-internals.d.ts` and `scripts/mermaid-layout-patch.mjs`, then rerunning the complete browser suite.

## GitHub release

Use the repository `theChildinus/mermaid-beauty`. Publish the source with README, manifest, MIT license, third-party notices, and build instructions on the default branch. Create the tag `1.2.0`, without a `v` prefix, for the reviewed commit.

Attach `dist/1.2.0/main.js`, `manifest.json`, `styles.css`, and `SHA256SUMS` to the release. The JavaScript includes bundled third-party notices. Read back the branch/tag and download asset hashes before marking the release delivered.

## Community directory

Follow the [official submission guide](https://docs.obsidian.md/plugins/releasing/submit-plugin) and [account setup guide](https://docs.obsidian.md/community-directory/set-up-and-claim).

Sign in at [Obsidian Community](https://community.obsidian.md/), link the GitHub owner profile, and add the public repository URL. Review the [developer policies](https://docs.obsidian.md/community-directory/developer-policies) and [plugin requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins) before accepting terms and submitting. Address review findings in a new release. Mark the plugin listed only after its published directory entry is visible.
