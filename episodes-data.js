/* Loads episodes for the site.
   1. Tries the live feed through /api/episodes (the Netlify Function).
   2. Falls back to data/episodes.json (a saved copy) if that fails.
   Then adds the extras the feed doesn't carry: season, episode type,
   Player of the Week and guests. Edit META below to change those. */
(function () {
  // Hand-checked extras for episodes so far. New episodes don't need an
  // entry: their season, type and Player of the Week are worked out
  // automatically (see guess* functions below). Add one only to override.
  var META = {
    60: { kind: 'GUEST EPISODE', who: 'Ilyas, Eshan & Ziyan Hemani', potw: 'Jake Guentzel (HM: Nikita Kucherov)' },
    59: { kind: 'DRAFT REWIND', potw: 'Cutter Gauthier (HM: Jack Hughes)' },
    58: { kind: 'DRAFT REWIND', potw: 'Jacob Fowler (HM: Drake Batherson)' },
    57: { kind: 'DRAFT REWIND', potw: 'Connor McDavid (HM: Leon Draisaitl)' },
    56: { kind: 'DRAFT REWIND', potw: 'Kirill Kaprizov (HM: Brady Tkachuk)' },
    55: { kind: 'GUEST EPISODE', who: 'Ilyas, Eshan & Troy Wansink', potw: 'Kyle Connor (HM: Jake Oettinger)' },
    54: { kind: 'DRAFT REWIND', potw: 'Evan Bouchard (HM: Connor McDavid)' },
    53: { kind: 'DRAFT REWIND' },
    52: { kind: 'PREDICTIONS' },
    51: { kind: 'GUEST EPISODE', who: 'Ilyas, Eshan & Dylan Hewlett', phase: 'Offseason' },
    50: { phase: 'Offseason' }, 49: { phase: 'Offseason' },
    48: { kind: 'GAME SHOW', phase: 'Offseason' }, 47: { phase: 'Offseason' },
    46: { kind: 'SPECIAL SEGMENT', phase: 'Offseason' }, 45: { phase: 'Offseason' },
    44: { phase: 'Offseason' }, 43: { phase: 'Offseason' },
    42: { kind: 'LIVE DRAFT', phase: 'Offseason', potw: 'Player of the Season: Connor McDavid' },
    41: { kind: 'AWARDS', phase: 'Playoffs', potw: 'Jordan Staal' },
    40: { kind: 'WATCH ALONG', phase: 'Playoffs' },
    39: { kind: 'STANLEY CUP FINAL', phase: 'Playoffs' },
    38: { phase: 'Playoffs', potw: 'Carter Hart (HM: Logan Stankoven)' },
    37: { phase: 'Playoffs' },
    36: { phase: 'Playoffs', potw: 'Pavel Dorofeyev (HM: Alexander Newhook)' },
    35: { kind: 'GUEST EPISODE', phase: 'Playoffs', who: 'Ilyas, Eshan, Eric Sabouri & Zach Jones', potw: 'Mitch Marner (HM: Jackson Blake)' },
    34: { phase: 'Playoffs', potw: 'Jakub Dobeš' },
    33: { phase: 'Playoffs', potw: 'Taylor Hall (HM: Matt Duchene)' },
    32: { kind: 'PREDICTIONS', phase: '2025–26', potw: 'Porter Martone (HM: Frederik Andersen)' },
    31: { potw: 'Clayton Keller (HM: Dylan Larkin)' },
    30: { potw: 'Jack Hughes (HM: Rickard Rakell)' },
    29: { potw: 'Jake Guentzel (HM: Pavel Zacha)' },
    28: { potw: 'Erik Karlsson (HM: Nikita Kucherov)' },
    27: { potw: 'Alexis Lafrenière (HM: Nikita Kucherov)' },
    26: { kind: 'TRADE DEADLINE', potw: 'Cutter Gauthier (HM: Martin Nečas)' },
    25: { potw: 'Matt Boldy (HM: Brayden Point)' },
    24: { kind: 'OLYMPICS', potw: 'Quinn Hughes (HM: Mitch Marner)' },
    23: { kind: 'OLYMPICS', potw: 'Juraj Slafkovský (HM: Connor McDavid)' },
    22: { potw: 'Nikita Kucherov (HM: Jack Eichel)' },
    21: { kind: 'WATCH ALONG', potw: 'Evan Bouchard (HM: Travis Konecny)' },
    20: { potw: 'Kirill Kaprizov (HM: Ryan O’Reilly)' },
    19: { potw: 'Jack Eichel (HM: Tage Thompson)' },
    18: { potw: 'David Pastrňák (HM: Connor McDavid)' },
    17: { kind: 'OLYMPICS', potw: 'Nikita Kucherov (HM: Auston Matthews)' },
    16: { kind: 'OLYMPICS' },
    15: { potw: 'Connor McDavid (HM: Matt Boldy)' },
    14: { potw: 'Connor McDavid (HM: John Gibson)' },
    13: { kind: 'YEAR IN REVIEW', potw: 'Mikko Rantanen (HM: Nathan MacKinnon)' },
    12: { kind: 'WATCH ALONG', potw: 'Brandon Hagel (HM: Logan Cooley)' },
    11: { potw: 'Alex Ovechkin (HM: Jake Guentzel)' },
    10: { potw: 'Jason Robertson (HM: Leon Draisaitl)' },
    9: { potw: 'Wyatt Johnston (HM: Cutter Gauthier)' },
    6: { kind: 'WATCH ALONG' },
    5: { kind: 'OPENING NIGHT' },
    4: { kind: 'SPECIAL SEGMENT' },
    3: { kind: 'PREDICTIONS', phase: '2025–26' },
    2: { phase: '2025–26' },
    1: { kind: 'PILOT', phase: '2025–26' }
  };

  // Season from the release date: July–mid-September is the offseason,
  // late April–June is the playoffs, everything else is that regular season.
  function guessPhase(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    if (isNaN(d)) return 'Episodes';
    var y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    if (m === 7 || m === 8 || (m === 9 && day < 15)) return 'Offseason';
    if (m === 5 || m === 6 || (m === 4 && day >= 21)) return 'Playoffs';
    var start = m >= 9 ? y : y - 1;
    return start + '–' + String(start + 1).slice(2);
  }

  function guessKind(e, phase) {
    var t = (e.title + ' ' + e.paragraphs.join(' ')).toLowerCase();
    if (/watch[- ]along/.test(t)) return 'WATCH ALONG';
    if (/\bft\.|joins (us|the show)|interview with|special guest/.test(t)) return 'GUEST EPISODE';
    if (/draft class rewind|rewind to the \d{4} draft|redraft/.test(t)) return 'DRAFT REWIND';
    if (/predictions/.test(t)) return 'PREDICTIONS';
    return phase === 'Offseason' ? 'OFFSEASON' : phase === 'Playoffs' ? 'PLAYOFFS' : 'REGULAR SEASON';
  }

  var NAME = '([A-Z][\\w’\'.-]+(?: [A-Z][\\w’\'.-]+){1,2})';
  function guessPotw(e) {
    var t = e.paragraphs.join(' ');
    var p = new RegExp('Player of the Week(?: honou?rs)?(?: is| goes to| going to|:)?\\s*(?:an easy one:\\s*)?' + NAME).exec(t) ||
            new RegExp(NAME + ' takes Player of the Week').exec(t);
    if (!p) return null;
    var hm = new RegExp(NAME + ' (?:grabs|takes|earns|earning|gets)[^.]{0,20}honou?rable mention').exec(t) ||
             new RegExp('with ' + NAME + ' earning HM').exec(t);
    return p[1] + (hm ? ' (HM: ' + hm[1] + ')' : '');
  }

  function firstSentence(s) {
    var m = /^(.+?[.!?])(\s|$)/.exec(s || '');
    var out = (m ? m[1] : s || '').trim();
    return out.length > 170 ? out.slice(0, 167).replace(/\s+\S*$/, '') + '…' : out;
  }

  function fmtDate(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return isNaN(d) ? '' : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }

  function fmtDuration(s) {
    if (!s) return '';
    var p = String(s).split(':').map(Number);
    var secs = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0];
    var h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60);
    return h ? h + ' hr ' + m + ' min' : m + ' min';
  }

  function enrich(list) {
    return list
      .filter(function (e) { return e.num != null; })
      .sort(function (a, b) { return b.num - a.num; })
      .map(function (e) {
        var meta = META[e.num] || {};
        var phase = meta.phase || guessPhase(e.date);
        var tags = [];
        var text = e.title + ' ' + e.paragraphs.join(' ');
        var kind = meta.kind || guessKind(e, phase);
        if (kind === 'GUEST EPISODE') tags.push('Guests');
        if (/Oilers|Edmonton|Oil Country/.test(text)) tags.push('Oilers');
        if (/trade/i.test(text)) tags.push('Trades');
        if (/predict/i.test(text)) tags.push('Predictions');
        if (/Olympic/.test(text)) tags.push('Olympics');
        return {
          num: e.num, title: e.title, date: e.date, dateLabel: fmtDate(e.date), runtime: fmtDuration(e.duration),
          audio: e.audio, paragraphs: e.paragraphs, teaser: firstSentence(e.paragraphs[0]),
          phase: phase, kind: kind, tags: tags.slice(0, 3),
          potw: meta.potw || guessPotw(e) || '—', who: meta.who || 'Ilyas & Eshan'
        };
      });
  }

  function timeout(ms) {
    return new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, ms); });
  }

  function getJSON(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  var cached = null;
  window.BITB = window.BITB || {};
  window.BITB.loadEpisodes = function () {
    if (cached) return cached;
    cached = Promise.race([getJSON('/api/episodes'), timeout(6000)])
      .then(function (d) { if (!d.episodes || !d.episodes.length) throw new Error('empty'); d.live = true; return d; })
      .catch(function () { return getJSON('data/episodes.json').then(function (d) { d.live = false; return d; }); })
      .then(function (d) { return { live: d.live, updated: d.updated, episodes: enrich(d.episodes) }; });
    return cached;
  };
})();
