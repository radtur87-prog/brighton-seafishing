// Runs in GitHub Actions (the dev sandbox cannot reach photo sites).
// Photos come from Openverse (api.openverse.org) limited to CC0 / Public Domain, i.e. free to use like
// the Unsplash licence. Unsplash and Pexels block automated downloads, so they are not used.
// For every theme in scripts/photos.json:
//   - only "query"        -> candidate thumbnails + manifest in assets/backgrounds/candidates/
//   - "id" (Openverse)    -> final 1200px WebP at assets/backgrounds/<theme>.webp, credited in CREDITS.md
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const UA = { 'User-Agent': 'AquaCare/1.0 (https://github.com/radtur87-prog/brighton-seafishing)' };
const API = 'https://api.openverse.org/v1/images';
const themes = JSON.parse(await readFile('scripts/photos.json', 'utf8'));
const out = 'assets/backgrounds';
await mkdir(`${out}/candidates`, { recursive: true });

async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}
const buffer = async (url) => Buffer.from(await (await get(url)).arrayBuffer());

const credits = [];
const manifest = {};
let pendingCandidates = false;

for (const [theme, cfg] of Object.entries(themes)) {
  if (cfg.id) {
    const photo = await (await get(`${API}/${cfg.id}/`)).json();
    if (!['cc0', 'pdm'].includes(photo.license)) throw new Error(`${cfg.id} is ${photo.license}, not CC0/PD`);
    await sharp(await buffer(photo.url))
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(`${out}/${theme}.webp`);
    credits.push(
      `| ${theme} | [${(photo.title ?? photo.id).replace(/\|/g, '/')}](${photo.foreign_landing_url}) | ${photo.creator ?? 'unknown'} | ${photo.license.toUpperCase()} |`
    );
    console.log(`final ${theme}: ${cfg.id}`);
    continue;
  }
  pendingCandidates = true;
  const q = new URLSearchParams({ q: cfg.query, license: 'cc0,pdm', aspect_ratio: 'wide', size: 'large', page_size: '20' });
  const data = await (await get(`${API}/?${q}`)).json();
  manifest[theme] = [];
  for (const p of data.results) {
    if (manifest[theme].length >= 8) break;
    if ((p.width ?? 0) < 1200) continue;
    const file = `${theme}-${manifest[theme].length}.jpg`;
    try {
      await sharp(await buffer(p.url)).rotate().resize({ width: 360 }).jpeg({ quality: 60 }).toFile(`${out}/candidates/${file}`);
      manifest[theme].push({ file, id: p.id, title: p.title, creator: p.creator, license: p.license, source: p.source });
    } catch (e) {
      console.log(`skip ${p.id}: ${e.message}`);
    }
  }
  console.log(`candidates ${theme}: ${manifest[theme].length} of ${data.result_count}`);
}

if (pendingCandidates) {
  await writeFile(`${out}/candidates/manifest.json`, JSON.stringify(manifest, null, 2));
} else {
  await rm(`${out}/candidates`, { recursive: true, force: true });
}
if (credits.length) {
  await writeFile(
    `${out}/CREDITS.md`,
    `# Background photos\n\nPublic-domain photos (CC0 / Public Domain Mark) found via [Openverse](https://openverse.org). Free to use without attribution – credited anyway.\n\n| Screen | Photo | Author | License |\n| --- | --- | --- | --- |\n${credits.join('\n')}\n`
  );
}
