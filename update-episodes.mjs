// Refreshes episodes.json from the RSS feed.
// Run with:  node scripts/update-episodes.mjs
// The site uses this file as a backup whenever the live feed can't be reached.
import { writeFile } from 'node:fs/promises';
import { fetchEpisodes } from './feed.mjs';

const data = await fetchEpisodes();
const out = new URL('./episodes.json', import.meta.url);
await writeFile(out, JSON.stringify(data, null, 1) + '\n');
const numbered = data.episodes.filter((e) => e.num != null).length;
console.log(`Saved ${numbered} numbered episodes (${data.episodes.length} feed items) to episodes.json`);
