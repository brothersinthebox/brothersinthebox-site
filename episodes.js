/* Episodes page: the grid of episode cards and each episode's own page.
   An episode's page lives at episodes.html?ep=60, so it can be shared. */
(function () {
  var app = document.getElementById('app');
  var LINKS = {
    spotify: 'https://open.spotify.com/show/4DXs6c3hSM9StEMNhwhtfP',
    apple: 'https://podcasts.apple.com/podcast/id1851736966',
    youtube: 'https://www.youtube.com/@BrothersintheBox'
  };
  var PAGE = 12;
  var state = { episodes: [], filter: 'All', limit: PAGE, live: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Colour per season: offseason blue, playoffs orange, the newest regular
  // season navy, older seasons black.
  function bandFor(phase, newestSeason) {
    if (phase === 'Offseason') return '#2D5FA3';
    if (phase === 'Playoffs') return '#AA5420';
    if (phase === newestSeason) return '#0A3A78';
    return '#0B0D10';
  }

  function filters() {
    var seen = [];
    state.episodes.forEach(function (e) { if (seen.indexOf(e.phase) < 0) seen.push(e.phase); });
    var list = [{ label: 'All', test: function () { return true; } }];
    seen.forEach(function (p) { list.push({ label: p, test: function (e) { return e.phase === p; } }); });
    list.push({ label: 'Oilers', test: function (e) { return e.tags.indexOf('Oilers') >= 0; } });
    list.push({ label: 'Guests', test: function (e) { return e.tags.indexOf('Guests') >= 0; } });
    return list;
  }

  function newestSeason() {
    var s = state.episodes.filter(function (e) { return /^\d{4}–\d{2}$/.test(e.phase); })[0];
    return s ? s.phase : null;
  }

  function card(e, ns) {
    var band = bandFor(e.phase, ns);
    return '<a class="card" href="?ep=' + e.num + '" data-ep="' + e.num + '" aria-label="Episode ' + e.num + ': ' + esc(e.title) + '">' +
      '<div class="art" aria-hidden="true">' +
        '<div class="stripe" style="background:' + band + '"></div>' +
        '<span class="bignum">' + e.num + '</span>' +
        '<div class="puck"><i class="side"></i><i class="mid"></i><i class="face">EP ' + e.num + '</i></div>' +
        '<span class="kind" style="background:' + band + '">' + esc(e.kind) + '</span>' +
      '</div>' +
      '<div class="body">' +
        '<span class="meta">' + esc(e.dateLabel) + (e.runtime ? ' · ' + esc(e.runtime) : '') + '</span>' +
        '<span class="title">' + esc(e.title) + '</span>' +
        '<span class="teaser">' + esc(e.teaser) + '</span>' +
        '<span class="tags">' + e.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</span>' +
      '</div></a>';
  }

  function renderIndex() {
    document.title = 'Episodes — Brothers in the Box';
    var fs = filters();
    var active = fs.filter(function (f) { return f.label === state.filter; })[0] || fs[0];
    var all = state.episodes.filter(active.test);
    var shown = all.slice(0, state.limit);
    var ns = newestSeason();
    var total = state.episodes.length;
    app.innerHTML =
      '<div class="wrap">' +
        '<header class="head">' +
          '<div style="display:flex;flex-direction:column;gap:12px;max-width:640px">' +
            '<p class="kicker">The archive</p>' +
            '<h1 class="display">Every episode is a project</h1>' +
            '<p class="lede">' + total + ' episodes, every Sunday since September 2025. Pick a puck to open the show notes, the Player of the Week and who was in the box.</p>' +
          '</div>' +
          '<div class="chips" role="group" aria-label="Filter episodes">' +
            fs.map(function (f) { return '<button type="button" class="chip" data-filter="' + esc(f.label) + '" aria-pressed="' + (f === active) + '">' + esc(f.label) + '</button>'; }).join('') +
          '</div>' +
        '</header>' +
        '<div class="grid">' + shown.map(function (e) { return card(e, ns); }).join('') + '</div>' +
        '<div class="more">' +
          '<span class="count">' + all.length + (all.length === 1 ? ' EPISODE' : ' EPISODES') + '</span>' +
          (all.length > state.limit ? '<button type="button" class="btn btn--ghost" data-more>Show more (' + (all.length - state.limit) + ' left)</button>' : '') +
          (state.live ? '' : '<span class="note">Showing the saved episode list. New episodes appear here once the live feed connects.</span>') +
        '</div>' +
      '</div>';
  }

  function renderDetail(e) {
    var i = state.episodes.indexOf(e);
    var newer = state.episodes[i - 1], older = state.episodes[i + 1];
    var band = bandFor(e.phase, newestSeason());
    document.title = 'Episode ' + e.num + ': ' + e.title + ' — Brothers in the Box';
    var player = e.audio
      ? '<audio controls preload="none" src="' + esc(e.audio) + '"></audio>'
      : '';
    app.innerHTML =
      '<article class="detail">' +
        '<a class="back" href="episodes.html" data-back><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4L6 9l5 5"/></svg>All episodes</a>' +
        '<header class="dhead">' +
          '<div class="left">' +
            '<p class="kicker" style="color:' + band + '">Episode ' + e.num + ' · ' + esc(e.kind) + '</p>' +
            '<h1 class="display">' + esc(e.title) + '</h1>' +
            '<p class="lede" style="font-size:19px">' + esc(e.teaser) + '</p>' +
          '</div>' +
          '<span class="num" aria-hidden="true" style="color:' + band + '">' + e.num + '</span>' +
        '</header>' +
        '<section class="player" aria-label="Listen">' +
          '<div class="row">' +
            '<div class="label"><small>EPISODE ' + e.num + (e.runtime ? ' · ' + esc(e.runtime).toUpperCase() : '') + '</small><b>' + (e.audio ? 'Play it here' : 'Hear the full episode') + '</b></div>' +
            '<div class="btn-row">' +
              '<a class="btn btn--light" href="' + LINKS.spotify + '" target="_blank" rel="noopener">Spotify</a>' +
              '<a class="btn btn--outline-light" href="' + LINKS.apple + '" target="_blank" rel="noopener">Apple Podcasts</a>' +
              '<a class="btn btn--outline-light" href="' + LINKS.youtube + '" target="_blank" rel="noopener">YouTube</a>' +
            '</div>' +
          '</div>' + player +
        '</section>' +
        '<div class="stats">' +
          '<div class="stat"><small>RELEASED</small><b>' + esc(e.dateLabel) + '</b></div>' +
          '<div class="stat"><small>RUNTIME</small><b>' + esc(e.runtime || '—') + '</b></div>' +
          '<div class="stat"><small>PLAYER OF THE WEEK</small><b>' + (e.potwWinner
            ? '<a href="potw.html?player=' + encodeURIComponent(e.potwWinner) + '">' + esc(e.potwWinner) + '</a>' +
              (e.potwHm ? ' <span style="font-weight:500;color:var(--muted)">(HM: <a href="potw.html?player=' + encodeURIComponent(e.potwHm) + '" style="color:inherit">' + esc(e.potwHm) + '</a>)</span>' : '')
            : esc(e.potw)) + '</b>' +
            (e.potwWinner || e.seasonAward ? '<a href="potw.html" style="font-size:13px;font-weight:600;margin-top:4px">See every pick →</a>' : '') + '</div>' +
          '<div class="stat"><small>IN THE BOX</small><b>' + esc(e.who) + '</b></div>' +
        '</div>' +
        '<section class="notes" aria-labelledby="h-notes">' +
          '<div class="side"><p class="kicker" style="color:' + band + '">From the show notes</p><h2 class="display" id="h-notes">Episode notes</h2></div>' +
          '<ol>' + e.paragraphs.map(function (p, k) {
            return '<li><span style="color:' + band + '">' + String(k + 1).padStart(2, '0') + '</span><p>' + esc(p) + '</p></li>';
          }).join('') + '</ol>' +
        '</section>' +
        '<nav class="pager" aria-label="More episodes">' +
          (newer ? '<a href="?ep=' + newer.num + '" data-ep="' + newer.num + '"><small>← NEWER · EP ' + newer.num + '</small><b>' + esc(newer.title) + '</b></a>' : '<span></span>') +
          (older ? '<a href="?ep=' + older.num + '" data-ep="' + older.num + '"><small>OLDER · EP ' + older.num + ' →</small><b>' + esc(older.title) + '</b></a>' : '<span></span>') +
        '</nav>' +
      '</article>';
  }

  function route() {
    var m = /[?&]ep=(\d+)/.exec(location.search);
    var e = m && state.episodes.filter(function (x) { return x.num === Number(m[1]); })[0];
    if (e) renderDetail(e); else renderIndex();
  }

  function go(url) {
    history.pushState({}, '', url);
    route();
    window.scrollTo(0, 0);
  }

  app.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-ep],[data-back],[data-filter],[data-more]');
    if (!t || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    if (t.hasAttribute('data-filter')) { state.filter = t.getAttribute('data-filter'); state.limit = PAGE; renderIndex(); return; }
    if (t.hasAttribute('data-more')) { state.limit += PAGE; renderIndex(); return; }
    ev.preventDefault();
    go(t.hasAttribute('data-back') ? 'episodes.html' : '?ep=' + t.getAttribute('data-ep'));
  });
  window.addEventListener('popstate', route);

  window.BITB.loadEpisodes().then(function (data) {
    state.episodes = data.episodes;
    state.live = data.live;
    route();
  }).catch(function () {
    app.innerHTML = '<div class="wrap"><p class="lede">Episodes couldn’t load. <a href="' + LINKS.spotify + '">Listen on Spotify</a> instead.</p></div>';
  });
})();
