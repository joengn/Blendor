import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT ?? 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};
createServer(async (request, response) => {
  try {
    const decoded = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (decoded.split('/').some((part) => part.startsWith('.') && part !== '.nojekyll')) {
      response.writeHead(404).end('Not found');
      return;
    }
    let target = path.resolve(root, '.' + decoded);
    if (!target.startsWith(root + path.sep) && target !== root) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    const content = await readFile(target);
    response
      .writeHead(200, {
        'content-type': mime[path.extname(target)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      })
      .end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Blendor: http://localhost:${port}`));
