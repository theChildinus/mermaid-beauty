import { build } from 'esbuild';
import { appendFile } from 'node:fs/promises';
import { thirdPartyNotices } from './licenses.mjs';
import { mermaidLayoutPatch } from './mermaid-layout-patch.mjs';
const result = await build({
  entryPoints: ['src/main.ts'], outfile: 'main.js', bundle: true,
  format: 'cjs', platform: 'browser', target: 'es2022',
  external: ['obsidian', '@codemirror/state', '@codemirror/view'],
  logLevel: 'info', legalComments: 'inline', minify: false, metafile: true,
  plugins: [mermaidLayoutPatch],
});
const notices = await thirdPartyNotices(Object.keys(result.metafile.inputs));
await appendFile('main.js', '\n' + notices.split('\n').map(line => `// ${line}`).join('\n') + '\n');
