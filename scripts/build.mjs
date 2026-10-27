import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'src'), path.join(output, 'src'), {
  recursive: true,
  filter: (source) => !['.DS_Store', '.gitkeep', 'README.md'].includes(path.basename(source)),
});
await cp(path.join(root, 'index.html'), path.join(output, 'index.html'));
// GitHub Pages should serve the ES modules and nested asset directories verbatim.
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Built dist/ — static files, no runtime dependencies.');
