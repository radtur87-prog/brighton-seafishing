// Runs in GitHub Actions (the dev sandbox cannot reach Unsplash).
// For every theme in scripts/photos.json:
//   - only "query"            -> candidate thumbnails + manifest in assets/backgrounds/candidates/
//   - "image" (photo-…) set   -> final 1200px WebP at assets/backgrounds/<theme>.webp, credited in CREDITS.md
// Candidates come from the free-licence Unsplash search (images.unsplash.com only; Unsplash+ lives on plus.unsplash.com).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const UA = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  'Accept-Language': 'en',
};
const themes = JSON.parse(await readFile('scripts/photos.json', 'utf8'));
const out = 'assets/backgrounds';
await mkdir(`${out}/candidates`, { recursive: true });

async function get(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}
const save = async (url, path) => writeFile(path, Buffer.from(await (await get(url)).arrayBuffer()));
const unique = (arr) => [...new Set(arr)];

const credits = [];
const manifest = {};
let pendingCandidates = false;

for (const [theme, cfg] of Object.entries(themes)) {
  if (cfg.image) {
    await save(`https://images.unsplash.com/${cfg.image}?w=1200&q=72&fm=webp&fit=max`, `${out}/${theme}.webp`);
    credits.push(`| ${theme} | ${cfg.page ? `[${cfg.page}](https://unsplash.com/photos/${cfg.page})` : cfg.image} | ${cfg.author ?? 'Unsplash'} |`);
    console.log(`final ${theme}: ${cfg.image}`);
    continue;
  }
  pendingCandidates = true;
  const slug = cfg.query.trim().replace(/\s+/g, '-');
  const html = await (await get(`https://unsplash.com/s/photos/${slug}?license=free&orientation=landscape`)).text();
  const images = unique([...html.matchAll(/https:\/\/images\.unsplash\.com\/(photo-[A-Za-z0-9-]+)/g)].map((m) => m[1])).slice(0, 8);
  const pages = unique([...html.matchAll(/href="\/photos\/([a-z0-9-]+)"/g)].map((m) => m[1])).slice(0, 12);
  manifest[theme] = { pages, candidates: [] };
  for (const [i, image] of images.entries()) {
    const file = `${theme}-${i}.jpg`;
    await save(`https://images.unsplash.com/${image}?w=360&q=60&fm=jpg&fit=max`, `${out}/candidates/${file}`);
    manifest[theme].candidates.push({ file, image });
  }
  console.log(`candidates ${theme}: ${images.length}`);
}

if (pendingCandidates) {
  await writeFile(`${out}/candidates/manifest.json`, JSON.stringify(manifest, null, 2));
} else {
  await rm(`${out}/candidates`, { recursive: true, force: true });
}
if (credits.length) {
  await writeFile(
    `${out}/CREDITS.md`,
    `# Background photos\n\nFree photos from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license) (free to use, no attribution required – credited anyway).\n\n| Screen | Photo | Author |\n| --- | --- | --- |\n${credits.join('\n')}\n`
  );
}
