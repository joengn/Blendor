import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';

async function files(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const name = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path.join(root, entry.name), name)));
    else if (entry.isFile()) result.push(name);
  }
  return result.sort();
}
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
async function zip(entries, target) {
  const chunks = [],
    directory = [];
  let offset = 0;
  for (const { source, name } of entries) {
    const data = await readFile(source),
      compressed = deflateRawSync(data),
      filename = Buffer.from(name);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc32(data), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50);
    central.writeUInt16LE(20, 4);
    header.copy(central, 6, 4, 30);
    central.writeUInt32LE(offset, 42);
    chunks.push(header, filename, compressed);
    directory.push(central, filename);
    offset += header.length + filename.length + compressed.length;
  }
  const central = Buffer.concat(directory),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  await writeFile(target, Buffer.concat([...chunks, central, end]));
}
const sourceFiles = [
  'index.html',
  'package.json',
  'package-lock.json',
  'README.md',
  '.gitignore',
  '.prettierrc.json',
  'vercel.json',
];
for (const dir of ['src', 'scripts', 'tests', 'docs', '.github']) {
  sourceFiles.push(...(await files(dir)).map((file) => `${dir}/${file}`));
}
await mkdir('release', { recursive: true });
await zip(
  sourceFiles.sort().map((source) => ({ source, name: `blendor/${source}` })),
  'release/blendor-source.zip',
);
await zip(
  (await files('dist')).map((name) => ({ source: `dist/${name}`, name })),
  'release/blendor-deploy.zip',
);
console.log('Created release/blendor-source.zip and release/blendor-deploy.zip');
