import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { sourceHash } from './source-hash.mjs';
import { zenumlSvgBuild } from './zenuml-svg-build.mjs';
import { mermaidLayoutPatch } from './mermaid-layout-patch.mjs';
await mkdir('.preview', { recursive: true });
const hash = await sourceHash();
await build({ entryPoints: ['dev/preview.ts'], outdir: '.preview', bundle: true, platform: 'browser', format: 'esm', splitting: true, minify: true, target: 'es2022', define: { BUILD_HASH: JSON.stringify(hash) }, logLevel: 'info', plugins: [mermaidLayoutPatch, zenumlSvgBuild] });
await build({ entryPoints: ['dev/native-preview.ts'], outfile: '.preview/native.js', bundle: true,
  platform: 'browser', format: 'iife', minify: true, target: 'es2022', logLevel: 'info' });
const nativeHtml = '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="/native.js"></script></body></html>';
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mermaid Beauty — rendering checks</title><link rel="stylesheet" href="/styles.css"><style>
.mermaid.preview-narrow{width:320px}.preview-native-frame{position:absolute;left:-10000px;width:1136px;height:800px;visibility:hidden}.preview-readme-article{width:1200px;max-width:100%;margin-bottom:24px}.preview-readme-svg{display:block;width:100%;height:auto}
*{box-sizing:border-box}body{margin:0;background:#f5f7f6;color:#24382d;font:15px system-ui}header{position:sticky;top:0;z-index:2;background:#ffffffed;padding:16px 28px;border-bottom:1px solid #dce5df}h1{font-size:24px;margin:0 0 10px}button{padding:8px 14px;font:inherit;background:#246d49;border:0;border-radius:8px;color:white;cursor:pointer}label{margin-left:20px}#status{display:block;margin-top:12px}#results{padding:24px}.card{padding:24px;max-width:1120px;margin:0 auto 24px;border:1px solid #dae5dd;border-radius:16px;overflow:hidden}.light-card{background:white;color:#246d49}.dark-card{background:#171c1a;color:#b3e4cb}.card h2{font-size:15px;margin:0 0 20px}.mermaid{width:100%;overflow:auto}.compact .card{max-width:360px;padding:16px}.card[data-passed=false]{border-color:red}pre{white-space:pre-wrap;font-size:12px}body.theme-dark{background:#171c1a}.theme-dark header{background:#203e32;color:#b3e4cb}
</style></head><body><header><h1>Mermaid Beauty</h1><button id="run">Run rendering checks</button><label><input type="checkbox" id="compact">Narrow preview</label><label><input type="checkbox" id="dark">Dark page</label><label>Diagram <select id="filter"><option value="">All</option></select></label><span id="status" role="status">Ready. Uses the same renderer as the plugin.</span></header><section style="margin:24px"><button id="export-readme">Export README comparisons</button><div id="readme-comparisons"></div></section><details style="margin:24px"><summary>Layout comparison</summary><label for="sample">Mermaid source</label><textarea id="sample" rows="8" style="display:block;width:100%;font:14px monospace"></textarea><button id="compare">Compare layouts</button><section id="comparisons"></section></details><main id="results"></main><script>window.addEventListener("error",e=>document.querySelector("#status").textContent="Load error: "+(e.message||e.target.src));window.addEventListener("unhandledrejection",e=>document.querySelector("#status").textContent="Unhandled error: "+e.reason);</script><script type="module" src="/preview.js"></script></body></html>`;
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/readme-assets' && req.method === 'POST') {
      if (req.headers.origin !== 'http://127.0.0.1:4173') { res.writeHead(403).end(); return; }
      let data = '';
      for await (const chunk of req) { data += chunk; if (data.length > 10_000_000) { res.writeHead(413).end(); return; } }
      const assets = JSON.parse(data);
      if (!Array.isArray(assets) || assets.length !== 3 || assets.some(asset =>
        !['flowchart', 'sequence', 'class'].includes(asset.name) || typeof asset.svg !== 'string')) {
        res.writeHead(400).end(); return;
      }
      for (const asset of assets) {
        await writeFile(`docs/images/${asset.name}-comparison.svg`, asset.svg);
      }
      await writeFile('.preview/readme-baseline.json', JSON.stringify(assets.map(({ name, baseline }) => ({ name, baseline })), null, 2));
      res.writeHead(200).end('Saved'); return;
    }
    if (req.url === '/report'  && req.method === 'POST') {
      if (req.headers.origin !== 'http://127.0.0.1:4173') { res.writeHead(403).end(); return; }
      let data = '';
      for await (const chunk of req) { data += chunk; if (data.length > 500_000) { res.writeHead(413).end(); return; } }
      const report = JSON.parse(data);
      if (report.buildHash !== hash || !Array.isArray(report.results) || !Array.isArray(report.checks)) { res.writeHead(400).end(); return; }
      await writeFile('.preview/report.json', JSON.stringify({ ...report, checkedAt: new Date().toISOString() }, null, 2));
      console.log(`Browser checks: ${report.results.length} renders, ${report.checks.length} behaviors, ${report.failed.length} failures`);
      res.writeHead(200).end('Saved'); return;
    }
    const files = { '/preview.js': ['.preview/preview.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
    res.setHeader('Cache-Control', 'no-store');
    const comparison = /^\/comparison\/(flowchart|sequence|class)$/.exec(req.url ?? '');
    if (comparison) {
      const svg = await readFile(`docs/images/${comparison[1]}-comparison.svg`, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html><head><meta charset="utf-8"><title>${comparison[1]} comparison</title><style>body{margin:0;background:#f5f7f6}body>svg{display:block;width:100%;height:100vh}</style></head><body>${svg}</body></html>`);
      return;
    }
    if (req.url === '/native.html') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(nativeHtml); return; }
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    const file = files[req.url] ?? (/^\/[\w.-]+\.js$/.test(req.url) ? [`.preview${req.url}`, 'text/javascript'] : undefined);
    if (!file) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file[1]); res.end(await readFile(file[0]));
  } catch (error) { console.error(error); res.writeHead(500).end('Preview failed'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173 — click Run rendering checks, then npm run test:render.'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
