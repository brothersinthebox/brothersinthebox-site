/* Episodes page: "the screen room". A round room lined with episode screens.
   You start looking down into it like a tunnel, drop in as you scroll, then
   the newest episodes fly forward one at a time. Click any screen to open it.
   episodes.js calls window.BITB.room.start(episodes) once episodes load. */
(function () {
  var T = window.THREE;
  var section = document.getElementById('room');
  var canvas = document.getElementById('room-canvas');
  window.BITB = window.BITB || {};
  if (!section || !canvas || !T) { if (section) section.hidden = true; return; }

  var FEATURED = 6;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = Math.min(window.innerWidth, window.innerHeight) < 700;
  var R = 10, COLS = 20, ROWS = small ? 11 : 16, ROW_H = 1.95, SCR_W = 2.62, SCR_H = 1.64;
  var TEX_W = small ? 384 : 512, TEX_H = Math.round(TEX_W * SCR_H / SCR_W);

  var overlay = {
    intro: document.getElementById('room-intro'),
    card: document.getElementById('room-card'),
    idx: document.getElementById('room-idx'),
    kind: document.getElementById('room-kind'),
    title: document.getElementById('room-title'),
    listen: document.getElementById('room-listen'),
    outro: document.getElementById('room-outro'),
    rail: document.getElementById('room-rail')
  };

  var renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: !small, powerPreference: 'high-performance' });
  } catch (e) { section.hidden = true; return; }
  renderer.setClearColor(0x03050a, 1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));

  var scene = new T.Scene();
  scene.fog = new T.FogExp2(0x03050a, 0.034);
  var camera = new T.PerspectiveCamera(52, 1, 0.1, 200);
  var room = new T.Group();
  scene.add(room);

  // ---------- Stars above the open top of the room ----------
  (function () {
    var n = 1400, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 90;
      var s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th); pos[i * 3 + 1] = Math.abs(r * u) + 10; pos[i * 3 + 2] = r * s * Math.sin(th);
    }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xe6ecf2, size: 0.35, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.8 })));
  })();

  // ---------- Floor: centre ice glowing blue ----------
  function floorTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 1024;
    var g = c.getContext('2d');
    g.fillStyle = '#04070d'; g.fillRect(0, 0, 1024, 1024);
    var glow = g.createRadialGradient(512, 512, 10, 512, 512, 512);
    glow.addColorStop(0, '#1d4f8f'); glow.addColorStop(0.25, '#0A3A78'); glow.addColorStop(0.6, '#06244d'); glow.addColorStop(1, 'rgba(4,7,13,0)');
    g.fillStyle = glow; g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = 'rgba(245,247,250,0.45)'; g.lineWidth = 6;
    g.beginPath(); g.arc(512, 512, 190, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(245,247,250,0.18)';
    g.beginPath(); g.arc(512, 512, 330, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(226,112,43,0.9)';
    g.beginPath(); g.arc(512, 512, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(226,112,43,0.35)'; g.fillRect(0, 506, 1024, 12);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  var floor = new T.Mesh(new T.CircleGeometry(R, 96), new T.MeshBasicMaterial({ map: floorTexture() }));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  // Soft blue ring of light where the wall meets the floor
  var ring = new T.Mesh(new T.CylinderGeometry(R - 0.05, R - 0.05, 0.7, 96, 1, true),
    new T.MeshBasicMaterial({ color: 0x0A3A78, transparent: true, opacity: 0.45, side: T.BackSide, depthWrite: false }));
  ring.position.y = 0.35; room.add(ring);

  // ---------- The puck at centre ice ----------
  var puck = new T.Group();
  (function () {
    var side = new T.MeshStandardMaterial({ color: 0x111317, roughness: 0.6, metalness: 0.2 });
    var lc = document.createElement('canvas'); lc.width = lc.height = 512;
    var lg = lc.getContext('2d');
    lg.fillStyle = '#15171b'; lg.fillRect(0, 0, 512, 512);
    lg.strokeStyle = '#E2702B'; lg.lineWidth = 10; lg.beginPath(); lg.arc(256, 256, 236, 0, Math.PI * 2); lg.stroke();
    var top = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 });
    var tt = new T.CanvasTexture(lc); tt.colorSpace = T.SRGBColorSpace; top.map = tt;
    var img = new Image();
    img.onload = function () { lg.drawImage(img, 106, 106, 300, 300); tt.needsUpdate = true; };
    img.src = 'logo-light.png';
    var m = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.48, 64), [side, top, side]);
    m.position.y = 0.24; puck.add(m);
    var shadow = new T.Mesh(new T.CircleGeometry(1.25, 48), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; shadow.scale.set(1, 1.6, 1); shadow.position.z = 0.5;
    puck.add(shadow);
  })();
  room.add(puck);
  scene.add(new T.AmbientLight(0xc9d3da, 0.8));
  var spot = new T.SpotLight(0xffffff, 60, 20, 0.5, 0.6, 1.5);
  spot.position.set(0, 9, 2); spot.target = puck; scene.add(spot);

  // ---------- Episode screen textures ----------
  var STYLES = [
    { bg: '#0A3A78', bg2: '#06244d', ink: '#FFFFFF', accent: '#E2702B', sub: '#9fb6d6' },
    { bg: '#F5F7FA', bg2: '#dfe6ec', ink: '#0B0D10', accent: '#0A3A78', sub: '#4A5560' },
    { bg: '#E2702B', bg2: '#b4501a', ink: '#0B0D10', accent: '#FFFFFF', sub: '#3b1a07' },
    { bg: '#0B0D10', bg2: '#16202e', ink: '#F5F7FA', accent: '#E2702B', sub: '#8a96a3' }
  ];
  var logoImg = new Image(); logoImg.src = 'logo-light.png';

  function wrap(g, text, maxW, maxLines) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; } else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return lines;
  }

  function screenTexture(e, k) {
    var s = STYLES[k % STYLES.length], W = TEX_W, H = TEX_H, u = W / 512;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, s.bg); grad.addColorStop(1, s.bg2);
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    // fake browser bar
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, W, 22 * u);
    ['#ff5f57', '#febc2e', '#28c840'].forEach(function (col, i) { g.fillStyle = col; g.beginPath(); g.arc((14 + i * 14) * u, 11 * u, 4 * u, 0, 7); g.fill(); });
    g.fillStyle = s.sub; g.font = '600 ' + (10 * u) + 'px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
    g.fillText('brothersinthebox.com/ep/' + e.num, 64 * u, 11.5 * u);
    // big episode number
    g.textBaseline = 'alphabetic';
    g.fillStyle = s.accent; g.globalAlpha = k % 4 === 1 ? 0.18 : 0.9;
    g.font = (150 * u) + 'px Anton, Impact, sans-serif'; g.textAlign = 'right';
    g.fillText(String(e.num), W - 18 * u, H - 22 * u);
    g.globalAlpha = 1; g.textAlign = 'left';
    // kind label
    g.font = '700 ' + (11 * u) + 'px "JetBrains Mono", monospace';
    g.fillStyle = s.accent === '#FFFFFF' ? '#0B0D10' : s.accent;
    g.fillText(String(e.kind || 'EPISODE').toUpperCase() + ' · EP ' + e.num, 22 * u, 52 * u);
    // title
    g.fillStyle = s.ink; g.font = (34 * u) + 'px Anton, Impact, sans-serif';
    var lines = wrap(g, String(e.title).toUpperCase(), W * 0.62, 3);
    lines.forEach(function (l, i) { g.fillText(l, 22 * u, (92 + i * 38) * u); });
    // footer
    g.fillStyle = s.sub; g.font = '500 ' + (11 * u) + 'px Inter, sans-serif';
    g.fillText(String(e.dateLabel || '') + (e.potwWinner ? '  ·  POTW ' + e.potwWinner : ''), 22 * u, H - 20 * u);
    g.fillStyle = s.accent; g.fillRect(22 * u, H - 44 * u, 46 * u, 5 * u);
    if (k % 4 === 3 && logoImg.complete && logoImg.naturalWidth) g.drawImage(logoImg, W * 0.62, 30 * u, 120 * u, 120 * u);
    var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  // ---------- Build the walls ----------
  var screens = [], hit = [], geo = new T.PlaneGeometry(SCR_W, SCR_H), episodes = [], featured = [];
  var mats = [];

  function build(list) {
    episodes = list;
    mats = list.map(function (e, i) { return new T.MeshBasicMaterial({ map: screenTexture(e, e.num), color: 0xffffff }); });
    var n = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        // Room level rows show newest first, so the wall you face is recent
        var k = (n * 7 + r * 3) % list.length; n++;
        if (r < 3) k = (r * COLS + c) % list.length;
        var a = (c + (r % 2) * 0.5) / COLS * Math.PI * 2 + Math.PI / 2;
        var m = new T.Mesh(geo, mats[k]);
        var y = 0.95 + r * ROW_H;
        m.position.set(Math.cos(a) * R, y, Math.sin(a) * R);
        m.lookAt(0, y, 0);
        m.userData = { ep: list[k], base: m.position.clone(), a: a, row: r };
        room.add(m); screens.push(m);
        if (r < 4) hit.push(m);
      }
    }
    // Featured screens: copies with a glowing frame that fly to the front
    featured = list.slice(0, FEATURED).map(function (e, i) {
      var g = new T.Group();
      var frame = new T.Mesh(new T.PlaneGeometry(SCR_W + 0.08, SCR_H + 0.08), new T.MeshBasicMaterial({ color: i % 2 ? 0xf5f7fa : 0xe2702b, fog: false }));
      frame.position.z = -0.004;
      var face = new T.Mesh(geo, new T.MeshBasicMaterial({ map: mats[i].map, fog: false }));
      g.add(frame); g.add(face);
      g.visible = false; g.userData = { ep: e };
      var src = screens.filter(function (s) { return s.userData.ep === e && s.userData.row < 3; })[0] || screens[i];
      g.userData.src = src;
      scene.add(g);
      hit.push(face); face.userData = { ep: e };
      return g;
    });
    overlay.rail.innerHTML = featured.map(function () { return '<i></i>'; }).join('');
    resize(); kick();
  }

  // ---------- Camera path ----------
  var qStart = new T.Quaternion(), qEnd = new T.Quaternion(), tmp = new T.Object3D(), camTmp = new T.PerspectiveCamera();
  var P_TOP = new T.Vector3(0, 40, 0.01), P_IN = new T.Vector3(0, 2.3, 7.4);
  camTmp.position.copy(P_TOP); camTmp.up.set(0, 0, -1); camTmp.lookAt(0, 0, 0); qStart.copy(camTmp.quaternion);
  camTmp.position.copy(P_IN); camTmp.up.set(0, 1, 0); camTmp.lookAt(0, 2.5, -R); qEnd.copy(camTmp.quaternion);

  function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
  function seg(p, a, b) { return smooth((p - a) / (b - a)); }

  var DESCENT_END = 0.24, FEAT_START = 0.27, FEAT_END = 0.94;
  var target = 0, prog = reduced ? 0.4 : 0, hover = null, lastIdx = -1;
  var heroPos = new T.Vector3(), worldSrc = new T.Vector3(), vA = new T.Vector3();

  function heroScale() {
    var dist = P_IN.z - 0.6;
    var visW = 2 * dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    return Math.min(2.0, (visW * (small ? 0.74 : 0.48)) / SCR_W);
  }

  function update(p) {
    // Descent: from looking down the tunnel to standing on the ice
    var d = seg(p, 0, DESCENT_END);
    var e2 = d * d;
    camera.position.set(0, P_TOP.y + (P_IN.y - P_TOP.y) * (1 - Math.pow(1 - d, 2.2)), P_TOP.z + (P_IN.z - P_TOP.z) * e2);
    camera.quaternion.copy(qStart).slerp(qEnd, smooth((d - 0.35) / 0.65));
    camera.fov = 70 - 18 * d; camera.updateProjectionMatrix();

    // The room slowly turns once you're inside
    room.rotation.y = p * 1.4;
    puck.rotation.y = p * 6;

    // Featured episodes fly out one at a time
    var span = (FEAT_END - FEAT_START) / Math.max(1, featured.length);
    var hs = heroScale();
    var active = -1;
    featured.forEach(function (g, i) {
      var a = FEAT_START + i * span, local = (p - a) / span;
      if (local < -0.05 || local > 1.05 || p < FEAT_START) { g.visible = false; g.userData.src.visible = true; return; }
      g.visible = true; g.userData.src.visible = false;
      var fin = smooth(local / 0.3), fout = smooth((local - 0.78) / 0.27);
      g.userData.src.updateWorldMatrix(true, false);
      g.userData.src.getWorldPosition(worldSrc);
      heroPos.set(camera.aspect > 1.2 ? 2.0 : 0, camera.aspect > 1.2 ? 2.35 : 2.95, 0.6);
      vA.copy(worldSrc).lerp(heroPos, fin);
      vA.y += Math.sin(fin * Math.PI) * 1.2;
      if (fout > 0) { vA.y += fout * 5; vA.z -= fout * 4; }
      g.position.copy(vA);
      tmp.position.copy(vA); tmp.up.set(0, 1, 0); tmp.lookAt(camera.position);
      g.quaternion.copy(g.userData.src.getWorldQuaternion(new T.Quaternion())).slerp(tmp.quaternion, fin);
      var sc = 1 + (hs - 1) * fin * (1 - fout * 0.6);
      g.scale.setScalar(sc);
      if (local > 0.12 && local < 0.86) active = i;
    });

    // Overlay text
    overlay.intro.style.opacity = 1 - seg(p, 0.02, 0.12);
    overlay.outro.style.opacity = seg(p, FEAT_END - 0.01, FEAT_END + 0.04);
    overlay.outro.style.pointerEvents = p > FEAT_END ? 'auto' : 'none';
    if (active !== lastIdx) {
      lastIdx = active;
      if (active >= 0) {
        var e = featured[active].userData.ep;
        overlay.idx.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(featured.length).padStart(2, '0') + (active === 0 ? ' · NEWEST' : '');
        overlay.kind.textContent = (e.kind + ' · ' + e.dateLabel + (e.runtime ? ' · ' + e.runtime : '')).toUpperCase();
        overlay.title.textContent = e.title;
        overlay.listen.href = '?ep=' + e.num;
        overlay.listen.setAttribute('data-ep', e.num);
        overlay.card.classList.add('on');
      } else overlay.card.classList.remove('on');
      [].forEach.call(overlay.rail.children, function (el, i) { el.classList.toggle('on', i === active); });
    }
  }

  // ---------- Hover and click ----------
  var ray = new T.Raycaster(), ptr = new T.Vector2(), pointerIn = false;
  canvas.addEventListener('pointermove', function (ev) {
    var r = canvas.getBoundingClientRect();
    ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1; ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    pointerIn = true; kick();
  });
  canvas.addEventListener('pointerleave', function () { pointerIn = false; kick(); });
  canvas.addEventListener('click', function () {
    if (hover && window.BITB.openEpisode) window.BITB.openEpisode(hover.userData.ep.num);
  });

  function pick() {
    var next = null;
    if (pointerIn && prog > DESCENT_END * 0.8) {
      ray.setFromCamera(ptr, camera);
      var hits = ray.intersectObjects(hit, false).filter(function (h) { return h.object.visible && (h.object.parent.visible !== false); });
      next = hits.length ? hits[0].object : null;
    }
    if (next !== hover) {
      if (hover && hover.userData.base) hover.scale.setScalar(1);
      hover = next;
      if (hover && hover.userData.base) hover.scale.setScalar(1.12);
      canvas.style.cursor = hover ? 'pointer' : '';
      canvas.title = hover ? 'Episode ' + hover.userData.ep.num + ': ' + hover.userData.ep.title : '';
    }
  }

  // ---------- Loop ----------
  function readScroll() {
    var r = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    target = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0.4;
  }

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  var visible = true, raf = 0, lastT = 0;
  function frame() {
    raf = 0;
    if (!visible || section.hidden) return;
    if (!reduced) readScroll();
    var now = performance.now(), dt = Math.min(0.25, (now - (lastT || now)) / 1000); lastT = now;
    var diff = target - prog;
    prog += reduced ? 0 : diff * (1 - Math.exp(-dt * 5));
    if (Math.abs(diff) < 0.0004) prog = target;
    update(prog);
    pick();
    renderer.render(scene, camera);
    if (Math.abs(target - prog) > 0.0004 || pointerIn) kick();
    else setTimeout(kick, 120); // keep a slow idle tick for the turning puck
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () { resize(); kick(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(section);
  }
  if (reduced) { section.classList.add('room--still'); target = prog = 0.4; }

  window.BITB.room = {
    start: function (list) {
      if (screens.length || !list || !list.length) return;
      var go = function () { build(list); };
      (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('40px Anton'), document.fonts.load('600 12px "JetBrains Mono"')]).then(go, go) : go();
    },
    show: function (on) { section.hidden = !on; if (on) { resize(); kick(); } }
  };
})();
