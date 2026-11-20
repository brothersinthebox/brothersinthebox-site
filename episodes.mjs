// Netlify Function: reads the podcast's RSS feed on the server (browsers
// can't read it directly) and hands the site a JSON list of episodes.
// Responses are cached for an hour, so the feed is read at most once an hour.
import { fetchEpisodes } from '../../lib/feed.mjs';

export default async () => {
  try {
    const data = await fetchEpisodes();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Netlify-CDN-Cache-Control': 'public, durable, max-age=3600, stale-while-revalidate=86400'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};

export const config = { path: '/api/episodes' };
