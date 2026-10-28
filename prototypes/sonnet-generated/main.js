(() => {
const P = (id, w, h) => `https://picsum.photos/id/${id}/${w}/${h}`;
const series = [
  {t:'quiet hours',     y:'2025', ids:[1018,1015,1016,1039,1043,1036]},
  {t:'concrete light',  y:'2025', ids:[1031,1033,1067,1060,1068,1070]},
  {t:'northern coast',  y:'2024', ids:[1044,1047,1050,1053,1056,1057]},
  {t:'salt and dust',   y:'2024', ids:[1058,1059,1062,1063,1074,1076]},
  {t:'short summers',   y:'2023', ids:[1080,1081,1082,1084,1035,1037]},
  {t:'after rain',      y:'2023', ids:[1041,1045,1049,1051,1052,1054]},
];

/* build series */
const ul = document.getElementById('series');
series.forEach((s,i) => {
  const li = document.createElement('li');
  li.className = 'series__item';
  li.innerHTML = `<a href="#" data-i="${i}"><div class="series__media">
    <img src="${P(s.ids[0],1400,940)}" alt="${s.t}" loading="lazy">
    <img class="series__img2" src="${P(s.ids[1],1400,940)}" alt="" loading="lazy"></div>
    <div class="series__meta"><span>${s.t}</span><span>${s.y} — ${s.ids.length} photographs</span></div></a>`;
  ul.appendChild(li);
});

/* smooth scroll */
let lenis;
if (window.Lenis && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
  lenis = new Lenis({lerp:.1});
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const h = a.getAttribute('href');
  if (h.length < 2 || a.dataset.i) return;
  const el = document.querySelector(h); if (!el) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(el) : el.scrollIntoView({behavior:'smooth'});
}));

/* reveal on scroll */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), {threshold:.15});
const observeAll = () => document.querySelectorAll('[data-lines]:not(.in),.series__item:not(.in)').forEach(el => io.observe(el));

/* preloader */
const pre = document.querySelector('.preloader'), cnt = pre.querySelector('.preloader__count');
let n = 0;
const tick = setInterval(() => {
  n = Math.min(100, n + Math.ceil(Math.random()*9));
  cnt.textContent = n;
  if (n >= 100) {
    clearInterval(tick);
    setTimeout(() => {
      pre.classList.add('done');
      document.body.classList.remove('is-loading');
      observeAll();
    }, 250);
  }
}, 45);

/* view toggle */
document.body.dataset.view = 'grid';
document.getElementById('toggle').addEventListener('click', () => {
  document.body.dataset.view = document.body.dataset.view === 'grid' ? 'list' : 'grid';
  setTimeout(() => lenis && lenis.resize(), 50);
});

/* lightbox */
const lb = document.getElementById('lightbox'), lbImg = lb.querySelector('.lightbox__img');
const lbTitle = document.getElementById('lbTitle'), lbCount = document.getElementById('lbCount');
let cs = 0, ci = 0;
const pad = n => String(n).padStart(2,'0');
function show(i){
  const s = series[cs]; ci = (i + s.ids.length) % s.ids.length;
  lbImg.style.opacity = 0;
  const img = new Image();
  img.onload = () => { lbImg.src = img.src; lbImg.alt = s.t; lbImg.style.opacity = 1; };
  img.src = P(s.ids[ci], 1800, 1200);
  lbTitle.textContent = s.t;
  lbCount.textContent = `${pad(ci+1)} / ${pad(s.ids.length)}`;
}
function open(i){
  cs = i; lb.hidden = false; requestAnimationFrame(() => lb.classList.add('open'));
  lenis && lenis.stop(); show(0);
}
function close(){
  lb.classList.remove('open');
  setTimeout(() => { lb.hidden = true; }, 500);
  lenis && lenis.start();
}
ul.addEventListener('click', e => {
  const a = e.target.closest('a[data-i]'); if (!a) return;
  e.preventDefault(); open(+a.dataset.i);
});
lb.addEventListener('click', e => {
  if (e.target.classList.contains('lightbox__prev')) return show(ci-1);
  if (e.target.classList.contains('lightbox__next')) return show(ci+1);
  close();
});
addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowRight') show(ci+1);
  if (e.key === 'ArrowLeft') show(ci-1);
});
let sx = null;
lb.addEventListener('touchstart', e => sx = e.touches[0].clientX, {passive:true});
lb.addEventListener('touchend', e => {
  if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
  if (Math.abs(dx) > 50) show(ci + (dx < 0 ? 1 : -1));
});

/* "view" cursor */
const cur = document.getElementById('cursor');
addEventListener('mousemove', e => {
  cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
  cur.classList.toggle('on', !!e.target.closest('.series__media') && lb.hidden);
});

/* WebGL ripple over a photograph */
(function(){
  const c = document.getElementById('gl');
  const gl = c.getContext('webgl');
  const sec = c.parentElement;
  const fallback = () => { sec.style.background = `#ccc url(${P(1015,1600,1000)}) center/cover`; };
  if (!gl) return fallback();
  const vs = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0,1);}';
  const fs = `precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 m;uniform float T,A,R;
  void main(){
    vec2 uv=v; vec2 q=(uv-.5)*vec2(R,1.);
    float d=distance(uv*vec2(R,1.),m*vec2(R,1.));
    float w=sin(d*28.-T*2.5)*exp(-d*5.)*.012;
    uv+=normalize(uv-m+.0001)*w;
    uv+=vec2(sin(uv.y*6.+T*.3),cos(uv.x*6.+T*.3))*.002;
    gl_FragColor=texture2D(t,uv);}`;
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = n => gl.getUniformLocation(pr, n);
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onerror = fallback;
  img.onload = () => {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    let mx = .5, my = .5, tx = .5, ty = .5, vis = false;
    new IntersectionObserver(e => vis = e[0].isIntersecting).observe(sec);
    sec.addEventListener('mousemove', e => { const r = sec.getBoundingClientRect(); tx = (e.clientX - r.left)/r.width; ty = (e.clientY - r.top)/r.height; });
    const loop = t => {
      requestAnimationFrame(loop); if (!vis) return;
      const dpr = Math.min(devicePixelRatio, 1.5), w = sec.clientWidth*dpr|0, h = sec.clientHeight*dpr|0;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; gl.viewport(0,0,w,h); }
      mx += (tx-mx)*.08; my += (ty-my)*.08;
      gl.uniform2f(u('m'), mx, my); gl.uniform1f(u('T'), t/1000); gl.uniform1f(u('R'), w/h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    requestAnimationFrame(loop);
  };
  img.src = P(1015, 1600, 1000);
})();
})();
