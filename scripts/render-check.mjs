import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { sourceHash } from './source-hash.mjs';
let report;
try { report = JSON.parse(await readFile('.preview/report.json', 'utf8')); }
catch { throw new Error('Run npm run dev:preview and click Run rendering checks in the browser first.'); }
assert.equal(report.buildHash, await sourceHash(), 'Source changed since browser checks. Restart preview and rerun.');
assert(report.results.length >= 76, 'Incomplete rendering suite');
assert(report.checks.length >= 7, 'Incomplete behavior checks');
for (const result of [...report.results, ...report.checks]) assert(result.passed, `${result.name}: ${result.error}`);
console.log(`${report.results.length} renders and ${report.checks.length} behavior checks passed in a real browser at ${report.checkedAt}.`);
