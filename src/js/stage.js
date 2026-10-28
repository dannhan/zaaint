/**
 * zaaint — WebGL displacement stage (About section)
 * Cursor-reactive ripple over a photograph. Engineering carried from V1:
 * aspect-cover UV math, DPR cap, visibility-gated rAF, graceful fallback.
 */
import { reduce } from './motion.js'

const VS = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`

const FS = `precision highp float;varying vec2 vUv;uniform sampler2D uT;uniform vec2 uM;uniform float uTime;uniform vec2 uRes;uniform vec2 uIm;
void main(){
  vec2 uv=vUv;
  float ca=uRes.x/uRes.y, ia=uIm.x/uIm.y;
  if(ca>ia){uv.y=.5+(uv.y-.5)*(ia/ca);}else{uv.x=.5+(uv.x-.5)*(ca/ia);}
  vec2 d=vUv-uM; d.x*=ca;
  float r=length(d);
  float a=exp(-r*3.5)*sin(r*26.-uTime*2.2);
  uv+=normalize(d+1e-5)*a*.018;
  gl_FragColor=vec4(texture2D(uT,uv).rgb,1.);
}`

export function initStage(getImageSrc) {
  const cv = document.getElementById('gl')
  const img = document.getElementById('stageImg')
  const stage = document.getElementById('about')
  if (!cv || !img || !stage) return

  const src = getImageSrc?.()
  if (!src) { cv.style.display = 'none'; return }
  img.src = src
  img.alt = 'a quiet photograph, slowly displaced by the cursor'

  const gl = cv.getContext && cv.getContext('webgl', { antialias: false, alpha: false })
  if (!gl || reduce) { cv.style.display = 'none'; return }

  let prog, U = {}, mx = .5, my = .5, tmx = .5, tmy = .5, T = 0, last = 0, visible = true

  function sh(type, s) {
    const o = gl.createShader(type)
    gl.shaderSource(o, s); gl.compileShader(o)
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o)
    return o
  }

  function setup() {
    try {
      prog = gl.createProgram()
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw 'link'
      gl.useProgram(prog)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, 'p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      ;['uT', 'uM', 'uTime', 'uRes', 'uIm'].forEach((k) => { U[k] = gl.getUniformLocation(prog, k) })
      gl.uniform1i(U.uT, 0)
      gl.uniform2f(U.uIm, img.naturalWidth, img.naturalHeight)
      img.style.display = 'none'
      resize()
      requestAnimationFrame(loop)
    } catch (err) {
      cv.style.display = 'none' // shader failed: plain <img> remains visible
    }
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    cv.width = stage.clientWidth * dpr
    cv.height = stage.clientHeight * dpr
    gl.viewport(0, 0, cv.width, cv.height)
    gl.uniform2f(U.uRes, cv.width, cv.height)
  }

  function loop(t) {
    requestAnimationFrame(loop)
    if (!visible || document.hidden) return
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016
    last = t; T += dt
    mx += (tmx - mx) * 0.06
    my += (tmy - my) * 0.06
    gl.uniform2f(U.uM, mx, 1 - my)
    gl.uniform1f(U.uTime, T)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  stage.addEventListener('pointermove', (e) => {
    const b = stage.getBoundingClientRect()
    tmx = (e.clientX - b.left) / b.width
    tmy = (e.clientY - b.top) / b.height
  }, { passive: true })

  new IntersectionObserver((es) => { visible = es[0].isIntersecting }).observe(stage)
  window.addEventListener('resize', () => { if (U.uRes) resize() })

  if (img.complete && img.naturalWidth) setup()
  else img.addEventListener('load', setup, { once: true })
  img.addEventListener('error', () => { cv.style.display = 'none' }, { once: true })
}
