import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { sourceHash } from './source-hash.mjs';
import { zenumlSvgBuild } from './zenuml-svg-build.mjs';
import { mermaidLayoutPatch } from './mermaid-layout-patch.mjs';
const port = Number(process.env.MERMAID_BEAUTY_PREVIEW_PORT ?? 4173);
const previewDir = process.env.MERMAID_BEAUTY_PREVIEW_DIR ?? '.preview';
const origin = `http://127.0.0.1:${port}`;
await mkdir(previewDir, { recursive: true });
const hash = await sourceHash();
await build({ entryPoints: ['tests/browser/preview.ts'], outdir: previewDir, bundle: true, platform: 'browser', format: 'esm', splitting: true, minify: true, target: 'es2022', define: { BUILD_HASH: JSON.stringify(hash) }, alias: { obsidian: './tests/browser/obsidian-export-stub.ts' }, logLevel: 'info', plugins: [mermaidLayoutPatch, zenumlSvgBuild] });
await build({ entryPoints: ['tests/browser/native-preview.ts'], outfile: `${previewDir}/native.js`, bundle: true,
  platform: 'browser', format: 'iife', minify: true, target: 'es2022', logLevel: 'info' });
const nativeHtml = '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="/native.js"></script></body></html>';
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mermaid Beauty — rendering checks</title><link rel="stylesheet" href="/styles.css"><style>
.mermaid.preview-narrow{width:320px;max-width:100%}.mermaid.preview-readability{width:1000px}.preview-native-frame{position:absolute;left:-10000px;width:1136px;height:800px;visibility:hidden}.preview-readme-article{width:1200px;max-width:100%;margin-bottom:24px}.preview-readme-svg{display:block;width:100%;height:auto}.preview-export-image{display:block;max-width:100%;height:auto;border:1px solid #89998e;margin-top:20px}
/* Zoom 1.7 fixture styles load after Beauty to cover either plugin load order. */
.preview-zoom-host{width:900px}.mermaid-zoom-modal-wrapper{position:absolute;width:fit-content;transform-origin:0 0}.mermaid-zoom-modal-wrapper svg{display:block}.mermaid-zoom-modal-wrapper svg *{vector-effect:non-scaling-stroke}
/* Inline geometry from Zoom 1.7: its six-button cluster belongs to the diagram. */
.preview-inline-zoom{position:relative;border:1px dashed #89998e}
.preview-inline-zoom > svg.preview-export-scrolled{max-width:none}
.preview-inline-zoom > .mermaid-zoom-inline-controls{position:absolute;bottom:8px;right:8px;z-index:100;display:flex;align-items:center;gap:2px}
.preview-inline-zoom .mermaid-zoom-icon-btn{display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:4px;border:0;border-radius:6px;background:#edf1ee;color:#42564a}
.light-card{--text-muted:#666;--text-normal:#222;--background-primary:#fff;--background-secondary:#f3f3f3;--background-modifier-border:#ddd;--interactive-accent:#7852ee}.dark-card{--text-muted:#aaa;--text-normal:#eee;--background-primary:#171c1a;--background-secondary:#25302b;--background-modifier-border:#444;--interactive-accent:#aa8aff}
*{box-sizing:border-box}body{margin:0;background:#f5f7f6;color:#24382d;font:15px system-ui}header{position:sticky;top:0;z-index:2;background:#ffffffed;padding:16px 28px;border-bottom:1px solid #dce5df}h1{font-size:24px;margin:0 0 10px}button{padding:8px 14px;font:inherit;background:#246d49;border:0;border-radius:8px;color:white;cursor:pointer}label{margin-left:20px}#status{display:block;margin-top:12px}#results{padding:24px}.card{padding:24px;max-width:1120px;margin:0 auto 24px;border:1px solid #dae5dd;border-radius:16px;overflow:hidden}.light-card{background:white;color:#246d49}.dark-card{background:#171c1a;color:#b3e4cb}.card h2{font-size:15px;margin:0 0 20px}.mermaid{width:100%;overflow:auto}.compact .card{max-width:360px;padding:16px}.card[data-passed=false]{border-color:red}pre{white-space:pre-wrap;font-size:12px}body.theme-dark{background:#171c1a}.theme-dark header{background:#203e32;color:#b3e4cb}
.preview-scroll-check{overflow:visible}
#palette-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:24px auto;max-width:1120px}.palette-card{padding:20px;overflow:auto;border:1px solid #89998e;border-radius:12px}.palette-card>svg{display:block;max-width:100%;height:auto;margin:20px 0}.palette-card h3{margin:0}@media(max-width:640px){#palette-checks{grid-template-columns:minmax(0,1fr);margin:16px}}
</style></head><body><header><h1>Mermaid Beauty</h1><button id="run">Run rendering checks</button><label><input type="checkbox" id="compact">Narrow preview</label><label><input type="checkbox" id="dark">Dark page</label><label>Diagram <select id="filter"><option value="">All</option></select></label><span id="status" role="status">Ready. Uses the same renderer as the plugin.</span></header><section style="margin:24px"><button id="export-readme">Export README comparisons</button><div id="readme-comparisons"></div></section><details style="margin:24px"><summary>Layout comparison</summary><label for="sample">Mermaid source</label><textarea id="sample" rows="8" style="display:block;width:100%;font:14px monospace"></textarea><button id="compare">Compare layouts</button><section id="comparisons"></section></details><details id="palette-review" style="margin:24px"><summary>Palette readability checks</summary><div id="palette-checks"></div></details><main id="results"></main><script>window.addEventListener("error",e=>document.querySelector("#status").textContent="Load error: "+(e.message||e.target.src));window.addEventListener("unhandledrejection",e=>document.querySelector("#status").textContent="Unhandled error: "+e.reason);</script><script type="module" src="/preview.js"></script></body></html>`;
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/readme-assets' && req.method === 'POST') {
      if (req.headers.origin !== origin) { res.writeHead(403).end(); return; }
      let data = '';
      for await (const chunk of req) { data += chunk; if (data.length > 20_000_000) { res.writeHead(413).end(); return; } }
      const assets = JSON.parse(data);
      const names = ['flowchart', 'chinese', 'dark'];
      if (!Array.isArray(assets) || assets.length !== names.length || new Set(assets.map(asset => asset.name)).size !== names.length || assets.some(asset =>
        !names.includes(asset.name) || typeof asset.svg !== 'string' ||
        typeof asset.png !== 'string' || !asset.png.startsWith('data:image/png;base64,') ||
        typeof asset.demoBefore !== 'string' || !asset.demoBefore.startsWith('data:image/png;base64,') ||
        typeof asset.demoAfter !== 'string' || !asset.demoAfter.startsWith('data:image/png;base64,') ||
        typeof asset.stackedPng !== 'string' || !asset.stackedPng.startsWith('data:image/png;base64,'))) {
        res.writeHead(400).end(); return;
      }
      for (const asset of assets) {
        await writeFile(`docs/images/${asset.name}-comparison.svg`, asset.svg);
        await writeFile(`docs/images/${asset.name}-comparison.png`, Buffer.from(asset.png.slice(22), 'base64'));
        await writeFile(`docs/images/${asset.name}-comparison-stacked.png`, Buffer.from(asset.stackedPng.slice(22), 'base64'));
        await writeFile(`${previewDir}/${asset.name}-before.png`, Buffer.from(asset.demoBefore.slice(22), 'base64'));
        await writeFile(`${previewDir}/${asset.name}-after.png`, Buffer.from(asset.demoAfter.slice(22), 'base64'));
      }
      await writeFile(`${previewDir}/readme-baseline.json`, JSON.stringify(assets.map(({ name, baseline }) => ({ name, baseline })), null, 2));
      res.writeHead(200).end('Saved'); return;
    }
    if (req.url === '/report'  && req.method === 'POST') {
      if (req.headers.origin !== origin) { res.writeHead(403).end(); return; }
      let data = '';
      for await (const chunk of req) { data += chunk; if (data.length > 500_000) { res.writeHead(413).end(); return; } }
      const report = JSON.parse(data);
      if (report.buildHash !== hash || !Array.isArray(report.results) || !Array.isArray(report.checks)) { res.writeHead(400).end(); return; }
      await writeFile(`${previewDir}/report.json`, JSON.stringify({ ...report, checkedAt: new Date().toISOString() }, null, 2));
      console.log(`Browser checks: ${report.results.length} renders, ${report.checks.length} behaviors, ${report.failed.length} failures`);
      res.writeHead(200).end('Saved'); return;
    }
    const files = { '/preview.js': [`${previewDir}/preview.js`, 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
    res.setHeader('Cache-Control', 'no-store');
    const comparison = /^\/comparison\/(flowchart|chinese|dark)$/.exec(req.url ?? '');
    if (comparison) {
      const svg = await readFile(`docs/images/${comparison[1]}-comparison.svg`, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html><head><meta charset="utf-8"><title>${comparison[1]} comparison</title><style>body{margin:0;background:#f5f7f6}body>svg{display:block;width:100%;height:100vh}</style></head><body>${svg}</body></html>`);
      return;
    }
    if (req.url === '/native.html') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(nativeHtml); return; }
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    const file = files[req.url] ?? (/^\/[\w.-]+\.js$/.test(req.url) ? [`${previewDir}${req.url}`, 'text/javascript'] : undefined);
    if (!file) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file[1]); res.end(await readFile(file[0]));
  } catch (error) { console.error(error); res.writeHead(500).end('Preview failed'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Preview: ${origin} — click Run rendering checks, then npm run test:render.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
