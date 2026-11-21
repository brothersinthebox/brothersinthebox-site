/* Player of the Week page: a leaderboard of who has won it most, and every
   pick in order. potw.html?player=Connor%20McDavid shows one player's weeks. */
(function () {
  var TOP = 10;
  var state = { picks: [], board: [], player: null, showAll: false, season: [] };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function key(name) { return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function plink(name) { return '<a href="?player=' + encodeURIComponent(name) + '" data-player="' + esc(name) + '">' + esc(name) + '</a>'; }

  function build(episodes) {
    var byKey = {};
    function entry(name) {
      var k = key(name);
      if (!byKey[k]) byKey[k] = { name: name, wins: 0, hms: 0, last: 0 };
      return byKey[k];
    }
    episodes.forEach(function (e) {
      if (e.seasonAward) state.season.push(e);
      if (!e.potwWinner) return;
      state.picks.push(e);
      var w = entry(e.potwWinner); w.wins++; w.last = Math.max(w.last, e.num);
      if (e.potwHm) { var h = entry(e.potwHm); h.hms++; h.last = Math.max(h.last, e.num); }
    });
    state.board = Object.keys(byKey).map(function (k) { return byKey[k]; })
      .sort(function (a, b) { return b.wins - a.wins || b.hms - a.hms || b.last - a.last; });
  }

  function current() {
    var m = /[?&]player=([^&]+)/.exec(location.search);
    if (!m) return null;
    var want = key(decodeURIComponent(m[1].replace(/\+/g, ' ')));
    var hit = state.board.filter(function (p) { return key(p.name) === want; })[0];
    return hit ? hit.name : null;
  }

  function renderBoard() {
    var max = state.board.length ? state.board[0].wins : 1;
    var list = state.showAll ? state.board : state.board.slice(0, TOP);
    var rank = 0, prev = null;
    document.getElementById('rows').innerHTML = state.board.map(function (p, i) {
      if (p.wins !== prev) { rank = i + 1; prev = p.wins; }
      if (list.indexOf(p) < 0 && p.name !== state.player) return '';
      var sub = p.wins + (p.wins === 1 ? ' win' : ' wins') + (p.hms ? ' · ' + p.hms + ' honourable mention' + (p.hms === 1 ? '' : 's') : '');
      return '<button type="button" class="row" data-player="' + esc(p.name) + '" aria-pressed="' + (p.name === state.player) + '">' +
        '<span class="rank">' + (p.wins ? rank : '–') + '</span><span class="name">' + esc(p.name) + '</span><span class="wins">' + p.wins + '</span>' +
        '<span class="bar" aria-hidden="true"><i style="width:' + (max ? Math.round(p.wins / max * 100) : 0) + '%"></i></span>' +
        '<span class="sub">' + sub + '</span></button>';
    }).join('');
    var t = document.getElementById('toggle');
    t.hidden = state.board.length <= TOP;
    t.textContent = state.showAll ? 'Show top ' + TOP : 'Show all ' + state.board.length + ' players';
  }

  function renderList() {
    var who = state.player, wk = who && key(who);
    var picks = who ? state.picks.filter(function (e) { return key(e.potwWinner) === wk || (e.potwHm && key(e.potwHm) === wk); }) : state.picks;
    document.getElementById('filterbar').innerHTML = who
      ? '<span class="pill">' + esc(who) + '<button type="button" data-clear aria-label="Show every player">✕</button></span><span class="count">' + picks.length + (picks.length === 1 ? ' WEEK' : ' WEEKS') + '</span>'
      : '<span class="count">' + picks.length + ' PICKS · NEWEST FIRST</span>';
    document.getElementById('list').innerHTML = picks.map(function (e) {
      return '<li class="pick">' +
        '<a class="ep" href="episodes.html?ep=' + e.num + '" aria-label="Episode ' + e.num + '">' + e.num + '<small>' + esc(e.dateLabel).toUpperCase() + '</small></a>' +
        '<div style="display:flex;flex-direction:column;gap:6px;min-width:0">' +
          '<span class="who">' + plink(e.potwWinner) + '</span>' +
          (e.potwHm ? '<span class="hm">Honourable mention: ' + plink(e.potwHm) + '</span>' : '') +
          '<span class="from">From <a href="episodes.html?ep=' + e.num + '">Episode ' + e.num + ': ' + esc(e.title) + '</a></span>' +
        '</div></li>';
    }).join('');
  }

  function render() {
    state.player = current();
    document.title = (state.player ? state.player + ' — ' : '') + 'Player of the Week — Brothers in the Box';
    renderBoard();
    renderList();
  }

  function go(player) {
    history.pushState({}, '', player ? '?player=' + encodeURIComponent(player) : 'potw.html');
    render();
    document.getElementById('h-picks').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('app').addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-player],[data-clear],#toggle');
    if (!t || ev.metaKey || ev.ctrlKey) return;
    ev.preventDefault();
    if (t.id === 'toggle') { state.showAll = !state.showAll; renderBoard(); return; }
    if (t.hasAttribute('data-clear')) { go(null); return; }
    var name = t.getAttribute('data-player');
    go(name === state.player ? null : name);
  });
  window.addEventListener('popstate', render);

  window.BITB.loadEpisodes().then(function (data) {
    build(data.episodes);
    var leader = state.board[0];
    document.getElementById('intro').textContent = state.picks.length + ' picks so far. ' +
      (leader ? leader.name + ' leads with ' + leader.wins + ' wins.' : '');
    document.getElementById('season').innerHTML = state.season.map(function (e) {
      return '<div class="season"><span class="trophy" aria-hidden="true">★</span><div><small>PLAYER OF THE SEASON · ' + esc(e.dateLabel).toUpperCase() + '</small><b>' + esc(e.seasonAward) + '</b><br><a href="episodes.html?ep=' + e.num + '">Revealed in Episode ' + e.num + '</a></div></div>';
    }).join('');
    render();
  }).catch(function () {
    document.getElementById('intro').textContent = 'The picks couldn’t load right now.';
  });
})();
