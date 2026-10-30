import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

// Check the actual static output, including blog links, assets, and anchor targets.
const root = resolve('dist');
const files = (await readdir(root, { recursive: true })).filter(file => file.endsWith('.html'));
const origin = 'https://baegll.github.io';
const html = new Map();
const failures = new Set();
let checked = 0;
async function targetFor(pathname) {
  const path = decodeURIComponent(pathname);
  const candidates = path.endsWith('/') ? [path + 'index.html'] : [path, path + '.html', path + '/index.html'];
  for (const candidate of candidates) {
    const target = resolve(root, '.' + candidate);
    if (relative(root, target).split(sep).includes('..')) continue;
    try { await access(target); return target; } catch {}
  }
}
async function content(path) {
  if (!html.has(path)) html.set(path, await readFile(path, 'utf8'));
  return html.get(path);
}
for (const file of files) {
  const source = await content(resolve(root, file));
  const url = new URL('/' + file.split(sep).join('/').replace(/index\.html$/, ''), origin);
  for (const match of source.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = match[1].replaceAll('&amp;', '&');
    const targetUrl = new URL(href, url);
    if (targetUrl.origin !== origin) continue;
    checked++;
    const target = await targetFor(targetUrl.pathname);
    if (!target) { failures.add(`${file}: missing ${href}`); continue; }
    if (targetUrl.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(targetUrl.hash.slice(1));
      const body = await content(target);
      if (!body.includes(`id="${id}"`) && !body.includes(`name="${id}"`)) failures.add(`${file}: missing anchor ${href}`);
    }
  }
}
if (failures.size) { console.error([...failures].join('\n')); process.exitCode = 1; }
else console.log(`Checked ${checked} internal links and assets across ${files.length} HTML files: no missing targets.`);
