/* Homepage: the 3D puck that scroll drives, plus the "latest episode" card.
   Add ?autoplay to the URL to run the whole story on its own (for screen recordings). */
(function () {
  var ORANGE = '#E2702B', NAVY = 0x0a3a78;
  var autoplay = /[?&]autoplay\b/.test(location.search);

  // Latest episode card in the Listen section
  if (window.BITB) {
    window.BITB.loadEpisodes().then(function (data) {
      var e = data.episodes[0];
      if (!e) return;
      document.getElementById('latest').href = 'episodes.html?ep=' + e.num;
      document.getElementById('latest-num').textContent = e.num;
      document.getElementById('latest-title').textContent = e.title;
      document.getElementById('latest-meta').textContent = ('Latest episode · ' + e.dateLabel).toUpperCase();
      document.getElementById('latest').hidden = false;
    }).catch(function () {});
  }

  var T = window.THREE;
  var canvas = document.getElementById('puck');
  if (!T || !canvas) return; // the CSS puck stays up as a poster

  var stage = document.getElementById('stage');
  var story = document.getElementById('story');
  var bigtype = document.getElementById('bigtype');
  var poster = document.getElementById('poster');
  var railFill = document.getElementById('rail-fill');
  var labels = [0, 1, 2].map(function (i) { return document.getElementById('label-' + i); });
  var ticks = [0, 1, 2, 3, 4].map(function (i) { return document.getElementById('tick-' + i); });
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(35, 1, 0.1, 100);

  // Studio reflections from bright panels
  var pmrem = new T.PMREMGenerator(renderer);
  var env = new T.Scene();
  env.add(new T.Mesh(new T.BoxGeometry(24, 24, 24), new T.MeshBasicMaterial({ color: 0x5c656c, side: T.BackSide })));
  function panel(w, h, pos, k) {
    var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k, k), side: T.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); env.add(m);
  }
  panel(10, 3, [0, 10, 0], 6);
  panel(3, 9, [-10, 3, 4], 4.5);
  panel(3, 7, [10, 2, -5], 3.5);
  panel(12, 2, [0, -1, 10], 1.4);
  scene.environment = pmrem.fromScene(env, 0.04).texture;

  var key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(-4, 6, 4); scene.add(key);
  var rim = new T.DirectionalLight(0xdfe9ff, 2.4); rim.position.set(3, 2, -6); scene.add(rim);

  function knurlTexture() {
    var c = document.createElement('canvas'); c.width = 2048; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 2048, 256);
    g.lineWidth = 7; g.strokeStyle = '#3a3a3a';
    for (var x = -256; x < 2048 + 256; x += 32) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 256, 256); g.stroke();
      g.beginPath(); g.moveTo(x + 256, 0); g.lineTo(x, 256); g.stroke();
    }
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 2048, 22); g.fillRect(0, 234, 2048, 22);
    var t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.repeat.set(3, 1); t.anisotropy = 8;
    return t;
  }
  var logoCanvas = document.createElement('canvas'); logoCanvas.width = logoCanvas.height = 1024;
  function drawLogo() {
    var g = logoCanvas.getContext('2d');
    g.fillStyle = '#0e0f11'; g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = '#cfd6db'; g.lineWidth = 12;
    g.beginPath(); g.arc(512, 512, 455, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(512, 512, 425, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#e9edf0'; g.textAlign = 'center';
    g.font = '150px Anton, Impact, sans-serif'; g.fillText('BROTHERS', 512, 470);
    g.font = '118px Anton, Impact, sans-serif'; g.fillText('IN THE BOX', 512, 610);
    g.fillStyle = ORANGE; g.fillRect(332, 640, 360, 10);
    g.fillStyle = '#a9b6c0'; g.font = '700 34px "JetBrains Mono", monospace';
    g.fillText('HOCKEY PODCAST', 512, 712);
    g.fillText('EST. 2025', 512, 330);
  }
  drawLogo();
  var logoTex = new T.CanvasTexture(logoCanvas); logoTex.colorSpace = T.SRGBColorSpace; logoTex.anisotropy = 8;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawLogo(); logoTex.needsUpdate = true; });

  var knurlMat = new T.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.7, metalness: 0, bumpMap: knurlTexture(), bumpScale: 3 });
  var logoMat = new T.MeshStandardMaterial({ map: logoTex, roughness: 0.48, metalness: 0 });
  var coreMat = new T.MeshStandardMaterial({ color: new T.Color(ORANGE), roughness: 0.35, metalness: 0.1 });
  var navyMat = new T.MeshStandardMaterial({ color: NAVY, roughness: 0.35, metalness: 0.1 });

  var R = 1.5;
  var puck = new T.Group(); scene.add(puck);
  var top = new T.Mesh(new T.CylinderGeometry(R, R, 0.12, 128, 1), [knurlMat, logoMat, navyMat]);
  var core = new T.Mesh(new T.CylinderGeometry(R * 0.996, R * 0.996, 0.26, 128, 1), [knurlMat, coreMat, coreMat]);
  var bottom = new T.Mesh(new T.CylinderGeometry(R, R, 0.12, 128, 1), [knurlMat, navyMat, logoMat]);
  puck.add(top); puck.add(core); puck.add(bottom);
  var parts = [top, core, bottom];

  var sc = document.createElement('canvas'); sc.width = sc.height = 256;
  var sg = sc.getContext('2d'); var grd = sg.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, 'rgba(11,13,16,0.55)'); grd.addColorStop(1, 'rgba(11,13,16,0)');
  sg.fillStyle = grd; sg.fillRect(0, 0, 256, 256);
  var shadow = new T.Mesh(new T.PlaneGeometry(4.6, 4.6), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  // One cue per scroll stop. cam/look are relative to the puck.
  var PI2 = Math.PI * 2;
  var cues = [
    { at: 0.00, cam: [0, 2.6, 7.4], look: [0, 0.8, 0], ex: 0, px: 0, tilt: 0.30, rot: 0, lab: 0 },
    { at: 0.25, cam: [2.3, 0.2, 2.5], look: [1.0, 0, 0.5], ex: 0, px: 1.2, tilt: 0.04, rot: 0.9, lab: 0 },
    { at: 0.50, cam: [0, 2.3, 7.8], look: [0, 0.1, 0], ex: 1, px: 0.9, tilt: 0.42, rot: 1.9, lab: 1 },
    { at: 0.75, cam: [5.0, 1.7, 5.4], look: [0, 0, 0], ex: 1, px: 0.9, tilt: 0.30, rot: 3.4, lab: 1 },
    { at: 1.00, cam: [0, 2.6, 7.4], look: [0, 0, 0], ex: 0, px: 1.2, tilt: 0.30, rot: PI2, lab: 0 }
  ];
  function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function blend(p) {
    var i = 0; while (i < cues.length - 2 && p > cues[i + 1].at) i++;
    var a = cues[i], b = cues[i + 1];
    var s = sstep(0.15, 0.85, (p - a.at) / (b.at - a.at));
    function L(x, y) { return x + (y - x) * s; }
    return {
      cam: [L(a.cam[0], b.cam[0]), L(a.cam[1], b.cam[1]), L(a.cam[2], b.cam[2])],
      look: [L(a.look[0], b.look[0]), L(a.look[1], b.look[1]), L(a.look[2], b.look[2])],
      ex: L(a.ex, b.ex), px: L(a.px, b.px), tilt: L(a.tilt, b.tilt), rot: L(a.rot, b.rot), lab: L(a.lab, b.lab)
    };
  }

  var cur = null, spin = 0, spinVel = 0, idle = 0, W = 1, H = 1, firstFrame = true;
  function resize() {
    W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  var dragging = false, lastX = 0;
  canvas.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; canvas.style.cursor = 'grabbing'; });
  window.addEventListener('pointermove', function (e) { if (!dragging) return; spinVel += (e.clientX - lastX) * 0.004; lastX = e.clientX; });
  window.addEventListener('pointerup', function () { dragging = false; canvas.style.cursor = 'grab'; });

  function progress(t) {
    if (autoplay) return 0.5 - 0.5 * Math.cos(t * PI2 / 28);
    var r = story.getBoundingClientRect();
    var range = r.height - H;
    if (range < 40) return 0;
    return Math.min(1, Math.max(0, -r.top / range));
  }

  var v = new T.Vector3(), last = performance.now(), start = last;
  function tick(now) {
    requestAnimationFrame(tick);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var p = progress((now - start) / 1000);
    var goal = blend(p);
    if (W / H < 0.8) {
      goal.px = 0;
      goal.cam = goal.cam.map(function (c) { return c * 1.6; });
      // Sit the puck in the upper half on phones, a little lower at the start so it clears the title
      goal.look = [goal.look[0], goal.look[1] - 0.9 + (0.55 - 0.8) * (1 - sstep(0, 0.2, p)), goal.look[2]];
    }
    if (!cur) cur = JSON.parse(JSON.stringify(goal));
    var k = 1 - Math.exp(-6 * dt);
    ['ex', 'px', 'tilt', 'rot', 'lab'].forEach(function (n) { cur[n] += (goal[n] - cur[n]) * k; });
    for (var j = 0; j < 3; j++) { cur.cam[j] += (goal.cam[j] - cur.cam[j]) * k; cur.look[j] += (goal.look[j] - cur.look[j]) * k; }

    if (!reduced) idle += dt * 0.12;
    spin += spinVel; spinVel *= Math.pow(0.04, dt);

    puck.position.set(cur.px, 0, 0);
    puck.rotation.set(cur.tilt, cur.rot + idle + spin, 0);
    var e = cur.ex;
    top.position.y = 0.19 + e * 1.05; top.rotation.z = e * 0.12;
    bottom.position.y = -0.19 - e * 1.05; bottom.rotation.z = -e * 0.12;
    shadow.position.set(cur.px, -1.15 - e * 0.9, 0);
    shadow.material.opacity = 1 - e * 0.55;

    camera.position.set(cur.px + cur.cam[0], cur.cam[1], cur.cam[2]);
    camera.lookAt(cur.px + cur.look[0], cur.look[1], cur.look[2]);
    renderer.render(scene, camera);

    if (firstFrame) { firstFrame = false; poster.style.opacity = '0'; }

    bigtype.style.opacity = String(1 - sstep(0.03, 0.14, p));
    bigtype.style.transform = 'translateY(' + (-sstep(0, 0.14, p) * 40) + 'px)';
    railFill.style.width = (p * 100).toFixed(2) + '%';
    ticks.forEach(function (el, i) { if (el) el.style.color = Math.abs(p - i * 0.25) < 0.125 ? '#0B0D10' : '#7A8691'; });

    puck.updateMatrixWorld();
    parts.forEach(function (part, i) {
      var el = labels[i];
      part.getWorldPosition(v);
      v.x += R * 0.92;
      v.project(camera);
      var x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      var w = el.offsetWidth || 260;
      x = Math.min(x, W - w - 12);
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translateY(-50%)';
      el.style.opacity = String(Math.max(0, (cur.lab - 0.15) / 0.85));
      el.style.visibility = cur.lab < 0.05 ? 'hidden' : 'visible';
    });
  }
  requestAnimationFrame(tick);
})();
