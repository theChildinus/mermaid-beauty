import assert from 'node:assert/strict';
import { mkdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const versions = JSON.parse(await readFile('versions.json', 'utf8'));
assert.equal(manifest.version, pkg.version);
assert.equal(versions[manifest.version], manifest.minAppVersion);
const dir = `dist/${manifest.version}`;
await mkdir(dir, { recursive: true });
const sums = [];
for (const name of ['main.js', 'manifest.json', 'styles.css']) {
  await copyFile(name, `${dir}/${name}`);
  sums.push(`${createHash('sha256').update(await readFile(name)).digest('hex')}  ${name}`);
}
await writeFile(`${dir}/SHA256SUMS`, sums.join('\n') + '\n');
console.log(`Release files: ${dir}`);
