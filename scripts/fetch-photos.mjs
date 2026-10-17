// Runs in GitHub Actions (the dev sandbox cannot reach Unsplash).
// For every theme in scripts/photos.json:
//   - only "query"      -> saves small candidate thumbnails + manifest to assets/backgrounds/candidates/
//   - "id" (Unsplash)   -> saves the final 1200px WebP to assets/backgrounds/<theme>.webp and credits it.
// Only free (non-Unsplash+) photos are used; they fall under the Unsplash License.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const UA = { 'User-Agent': 'Mozilla/5.0 (AquaCare photo fetcher)', Accept: 'application/json' };
const themes = JSON.parse(await readFile('scripts/photos.json', 'utf8'));
const out = 'assets/backgrounds';
await mkdir(`${out}/candidates`, { recursive: true });

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function save(url, path) {
  const res = await fetch(url, { headers: { 'User-Agent': UA['User-Agent'] } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
}

const credits = [];
const manifest = {};
let pendingCandidates = false;

for (const [theme, cfg] of Object.entries(themes)) {
  if (cfg.id) {
    const photo = await getJson(`https://unsplash.com/napi/photos/${cfg.id}`);
    if (photo.premium || photo.plus) throw new Error(`${cfg.id} is Unsplash+ (not free)`);
    await save(`${photo.urls.raw}&w=1200&q=72&fm=webp&fit=max`, `${out}/${theme}.webp`);
    credits.push(
      `| ${theme} | [${photo.alt_description ?? photo.id}](${photo.links.html}) | [${photo.user.name}](${photo.user.links.html}) |`
    );
    console.log(`final ${theme}: ${cfg.id}`);
    continue;
  }
  pendingCandidates = true;
  const data = await getJson(
    `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(cfg.query)}&per_page=20&orientation=landscape`
  );
  const free = data.results.filter((p) => !p.premium && !p.plus).slice(0, 6);
  manifest[theme] = [];
  for (const [i, p] of free.entries()) {
    const file = `${theme}-${i}.jpg`;
    await save(`${p.urls.raw}&w=360&q=60&fm=jpg&fit=max`, `${out}/candidates/${file}`);
    manifest[theme].push({ file, id: p.id, alt: p.alt_description, author: p.user.name });
  }
  console.log(`candidates ${theme}: ${manifest[theme].length}`);
}

if (pendingCandidates) {
  await writeFile(`${out}/candidates/manifest.json`, JSON.stringify(manifest, null, 2));
} else {
  await rm(`${out}/candidates`, { recursive: true, force: true });
}
if (credits.length) {
  await writeFile(
    `${out}/CREDITS.md`,
    `# Background photos\n\nFree photos from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license).\n\n| Screen | Photo | Author |\n| --- | --- | --- |\n${credits.join('\n')}\n`
  );
}
