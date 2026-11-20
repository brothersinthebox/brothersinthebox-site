// Turns the Riverside RSS feed into the small JSON the site reads.
// No dependencies, so it runs in Node 18+ and in Netlify Functions as is.

export const FEED_URL = 'https://api.riverside.com/hosting/JyYkWWFr.rss';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m));
}

function cdata(s) {
  const m = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(s || '');
  return m ? m[1] : decode(s || '');
}

function tag(xml, name) {
  const m = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i').exec(xml);
  return m ? m[1] : '';
}

function attr(xml, name, a) {
  const m = new RegExp('<' + name + '\\s[^>]*' + a + '="([^"]*)"', 'i').exec(xml);
  return m ? decode(m[1]) : '';
}

function paragraphs(html) {
  const text = cdata(html);
  let parts = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(text))) parts.push(m[1]);
  if (!parts.length) parts = text.split(/<br\s*\/?>|\n{2,}/i);
  return parts
    .map((p) => decode(p.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
    .filter((p) => p && !/^new episodes every week/i.test(p) && !/^follow along @/i.test(p));
}

export function parseFeed(xml) {
  const items = xml.split(/<item>/i).slice(1).map((chunk) => chunk.split(/<\/item>/i)[0]);
  const episodes = items.map((it) => {
    const rawTitle = decode(cdata(tag(it, 'title'))).trim();
    const m = /^episode\s+(\d+)\s*:\s*(.*)$/i.exec(rawTitle);
    const date = new Date(tag(it, 'pubDate'));
    return {
      num: m ? Number(m[1]) : null,
      title: (m ? m[2] : rawTitle).replace(/\s+/g, ' ').trim(),
      date: isNaN(date) ? null : date.toISOString().slice(0, 10),
      duration: tag(it, 'itunes:duration').trim() || null,
      audio: attr(it, 'enclosure', 'url') || null,
      guid: cdata(tag(it, 'guid')).trim() || null,
      paragraphs: paragraphs(tag(it, 'description'))
    };
  });
  return { updated: new Date().toISOString(), source: FEED_URL, episodes };
}

export async function fetchEpisodes(fetchImpl = fetch) {
  const res = await fetchImpl(FEED_URL, { headers: { 'User-Agent': 'BrothersInTheBox-site/1.0' } });
  if (!res.ok) throw new Error('Feed returned ' + res.status);
  return parseFeed(await res.text());
}
