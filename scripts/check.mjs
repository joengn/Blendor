import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
for (const file of [
  ...(await files('src')),
  ...(await files('scripts')),
  ...(await files('tests')),
]) {
  if (!/\.m?js$/.test(file)) continue;
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) {
    process.stderr.write(check.stderr);
    process.exit(1);
  }
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    try {
      await readFile(path.resolve(path.dirname(file), match[1]));
    } catch {
      throw new Error(`Broken module import: ${file} → ${match[1]}`);
    }
  }
}
console.log('JavaScript syntax and local module imports are valid.');

// Verify every local stylesheet and module linked by the app entry page.
const entry = await readFile('index.html', 'utf8');
for (const match of entry.matchAll(/(?:src|href)=["'](\.[^"']+)["']/g)) {
  try {
    await readFile(path.resolve(match[1]));
  } catch {
    throw new Error(`Broken entry asset: ${match[1]}`);
  }
}
console.log('HTML entry assets are valid.');
