import { build } from 'esbuild';
import { appendFile, readFile } from 'node:fs/promises';
import { thirdPartyNotices } from './licenses.mjs';
import { zenumlSvgBuild } from './zenuml-svg-build.mjs';
import { mermaidLayoutPatch } from './mermaid-layout-patch.mjs';
const result = await build({
  entryPoints: ['src/main.ts'], outfile: 'main.js', bundle: true,
  format: 'cjs', platform: 'browser', target: 'es2022',
  external: ['obsidian', '@codemirror/state', '@codemirror/view'],
  logLevel: 'info', legalComments: 'inline', minify: true, metafile: true,
  plugins: [mermaidLayoutPatch, zenumlSvgBuild],
});
// The standalone previews use browser APIs and localhost report endpoints.
// Enforce that development-only code never enters the shipped plugin.
if (Object.keys(result.metafile.inputs).some(path => /^(dev|tests)\//.test(path))) {
  throw new Error('The production bundle must not include browser test or preview code.');
}
const notices = await thirdPartyNotices(Object.keys(result.metafile.inputs));
await appendFile('main.js', '\n' + notices.split('\n').map(line => `// ${line}`).join('\n') + '\n');

const bundle = await readFile('main.js', 'utf8');
if (/createElement\(\s*["']script["']/.test(bundle) || /\blocalStorage\s*[.[]|\bsessionStorage\s*[.[]/.test(bundle)) {
  throw new Error('The production bundle contains a script element or browser storage access.');
}
if (Object.keys(result.metafile.inputs).some(path => /node_modules\/(react|react-dom|jotai)\//.test(path))) {
  throw new Error('The production bundle must not include the ZenUML editor.');
}
console.log(`Production bundle: ${Buffer.byteLength(bundle)} bytes; no script creation, browser storage, or React editor.`);
