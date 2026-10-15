// Minimal static server for the `expo export --platform web` output, with SPA fallback to index.html.
// BASE_PATH (e.g. /brighton-seafishing) mimics GitHub Pages serving the app under a sub-path.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const port = Number(process.env.PORT ?? 8085);
const base = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
};

createServer(async (req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (base) {
    if (urlPath !== base && !urlPath.startsWith(`${base}/`)) {
      res.writeHead(404).end('outside base path');
      return;
    }
    urlPath = urlPath.slice(base.length) || '/';
  }
  let file = normalize(join(root, urlPath));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('dir');
  } catch {
    file = join(root, 'index.html');
  }
  const body = await readFile(file);
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
}).listen(port, () => console.log(`serving dist${base ? ` under ${base}` : ''} on http://localhost:${port}`));
