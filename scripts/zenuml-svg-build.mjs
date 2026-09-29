import { readFile } from 'node:fs/promises';
import { dirname, resolve, relative, extname } from 'node:path';

// @zenuml/core publishes SVG and React editor code in one pre-bundled module.
// Rebuild its unmodified SVG entry from the npm package's embedded sources so
// tree shaking can exclude the editor, script loader, and browser storage.
// This is build-time only: no sources or scripts are downloaded at runtime.
export const zenumlSvgBuild = {
  name: 'zenuml-svg-only',
  async setup(build) {
    const root = resolve('node_modules/@zenuml/core');
    const pkg = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
    if (pkg.version !== '3.50.1') throw new Error('Review the ZenUML SVG build adapter before upgrading @zenuml/core.');
    const sources = new Map();
    for (const file of ['zenuml.esm.mjs.map', 'cloud-icons-eHuugVSv.js.map']) {
      const map = JSON.parse(await readFile(`${root}/dist/${file}`, 'utf8'));
      map.sources.forEach((name, i) => sources.set(resolve(root, 'dist', name), map.sourcesContent[i]));
    }
    const entry = `${root}/src/svg/renderToSvg.ts`;
    if (!sources.has(entry)) throw new Error('ZenUML SVG source is missing from the locked package.');
    build.onResolve({ filter: /^@zenuml\/core$/ }, () => ({ path: relative(process.cwd(), entry), namespace: 'zenuml-svg' }));
    build.onResolve({ filter: /.*/, namespace: 'zenuml-svg' }, args => {
      if (!args.path.startsWith('.') && !args.path.startsWith('@/')) return;
      const base = args.path.startsWith('@/') ? resolve(root, 'src', args.path.slice(2)) : resolve(dirname(resolve(args.importer)), args.path);
      const path = [base, `${base}.ts`, `${base}.js`, `${base}/index.ts`, `${base}/index.js`].find(path => sources.has(path));
      if (!path) throw new Error(`Missing ZenUML SVG dependency: ${args.path} from ${args.importer}`);
      return { path: relative(process.cwd(), path), namespace: 'zenuml-svg' };
    });
    build.onLoad({ filter: /.*/, namespace: 'zenuml-svg' }, args => ({
      contents: sources.get(resolve(args.path)),
      loader: extname(args.path) === '.ts' ? 'ts' : 'js',
      resolveDir: root,
    }));
  },
};
