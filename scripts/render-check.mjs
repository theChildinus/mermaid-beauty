import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { sourceHash } from './source-hash.mjs';
let report;
try { report = JSON.parse(await readFile(`${process.env.MERMAID_BEAUTY_PREVIEW_DIR ?? '.preview'}/report.json`, 'utf8')); }
catch { throw new Error('Run npm run dev:preview and click Run rendering checks in the browser first.'); }
assert.equal(report.buildHash, await sourceHash(), 'Source changed since browser checks. Restart preview and rerun.');
assert(report.results.length >= 80, 'Incomplete rendering suite');
assert(report.checks.length >= 555, 'Incomplete behavior checks');
assert(report.checks.filter(check => check.name.startsWith('Zoom ')).length >= 165, 'Incomplete Zoom compatibility checks');
assert.deepEqual(report.failed, [], 'Browser reported failed checks');
for (const result of [...report.results, ...report.checks]) assert(result.passed, `${result.name}: ${result.error}`);
console.log(`${report.results.length} renders and ${report.checks.length} behavior checks passed in a real browser at ${report.checkedAt}.`);
