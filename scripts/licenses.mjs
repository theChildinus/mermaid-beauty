import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function thirdPartyNotices(inputs) {
  const roots = new Set();
  for (const input of inputs) {
    const match = input.replace(/^zenuml-svg:/, '').match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
    if (match) roots.add(match[1]);
  }
  const entries = [];
  for (const root of roots) {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? '';
    const files = (await readdir(root)).filter(file => /^(licen[cs]e|copying|notice)(\.|$)/i.test(file));
    const parts = [];
    for (const file of files.sort()) {
      try { parts.push(await readFile(join(root, file), 'utf8')); } catch (error) { if (error.code !== 'EISDIR') throw error; }
    }
    if (pkg.name === 'antlr4') parts.push(await readFile('licenses/antlr4-LICENSE', 'utf8'));
    if (pkg.name === 'mermaid') parts.push(await readFile('licenses/mermaid-LICENSE', 'utf8'));
    if (!parts.length) console.warn(`No separate license file packaged for ${pkg.name}; see its source repository and retained bundle notices.`);
    entries.push({ name: pkg.name, text: `## ${pkg.name} ${pkg.version}\n\nLicense: ${pkg.license ?? 'See source'}. Source: ${repository.replace(/^git\+/, '') || 'See package-lock.json'}.\n\n${parts.map(text => '```text\n' + text.trim() + '\n```').join('\n\n')}` });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const notice = '# Third-party licenses\n\nGenerated from the bundled dependencies. Original notices embedded by upstream builds are also retained in main.js. The ELK code is unmodified; its source is available at https://github.com/kieler/elkjs/tree/v0.9.3.\n\n' + entries.map(entry => entry.text).join('\n\n');
  await writeFile('THIRD_PARTY_LICENSES.md', notice + '\n');
  return notice;
}
