import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
export async function sourceHash() {
  const hash = createHash('sha256');
  for (const dir of ['src', 'tests/browser', 'scripts']) for (const file of (await readdir(dir)).sort()) {
    hash.update(`${dir}/${file}`); hash.update(await readFile(`${dir}/${file}`));
  }
  for (const file of ['package-lock.json', 'styles.css']) hash.update(await readFile(file));
  return hash.digest('hex');
}
