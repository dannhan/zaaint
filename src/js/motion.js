/**
 * zaaint — motion system
 * Lenis smooth scroll, GSAP ScrollTrigger moments, reveal observer,
 * "view" cursor, preloader. Every piece respects prefers-reduced-motion.
 */
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- smooth scroll ---------- */
export function initLenis() {
  if (reduce) return null
  const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) })
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf) }
  requestAnimationFrame(raf)
  return lenis
}

export function scrollToEl(lenis, el) {
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: 0 })
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
}

/* ---------- reveals (IO + CSS classes; proven in prototypes) ---------- */
export function initReveals(scope) {
  const root = scope || document
  if (reduce) {
    root.querySelectorAll('.lm, .rv-fade, .clip').forEach((el) => el.classList.add('in'))
    return
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return
      e.target.classList.add('in')
      io.unobserve(e.target)
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
  root.querySelectorAll('.rv-fade:not(.in), .clip:not(.in)').forEach((el) => io.observe(el))
}

/* ---------- scroll-linked moments (GSAP) ---------- */
export function initScrollMoments(lenis) {
  if (reduce) return
  if (lenis) lenis.on('scroll', ScrollTrigger.update) // keep triggers in sync with lenis frames
  // hero drift: title eases up as you leave the hero
  const heroH1 = document.querySelector('.hero h1')
  if (heroH1) {
    gsap.to(heroH1, {
      yPercent: -12, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    })
  }
  // stage image: slow scale-settle while the stage is in view
  const stageImg = document.querySelector('.stage-img')
  const stage = document.querySelector('.stage')
  if (stageImg && stage) {
    gsap.fromTo(stageImg, { scale: 1.08 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true },
    })
  }
}

/* ---------- "view" cursor ---------- */
export function initCursor() {
  const cur = document.getElementById('cur')
  if (!cur || reduce || !window.matchMedia('(hover:hover)').matches) return
  let cx = 0, cy = 0, tx = 0, ty = 0
  window.addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY
    const hit = e.target.closest('[data-cursor="view"]')
    cur.style.opacity = hit ? 1 : 0
  }, { passive: true })
  ;(function loop() {
    cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2
    cur.style.transform = `translate(${cx - 12}px, ${cy - 8}px) translate(-50%, -50%)`
    requestAnimationFrame(loop)
  })()
}

/* ---------- preloader ---------- */
export function initPreloader(lenis) {
  const pre = document.getElementById('pre')
  if (!pre) { document.body.classList.add('loaded'); return }
  if (reduce) { pre.remove(); document.body.classList.add('loaded'); return }
  document.body.classList.add('is-loading')
  if (lenis) lenis.stop()
  const n = { v: 0 }
  const num = document.createElement('span')
  const label = document.createElement('span')
  label.textContent = 'zaaint'
  pre.appendChild(label); pre.appendChild(num)
  gsap.to(n, {
    v: 100, duration: 1.3, ease: 'power4.out',
    onUpdate: () => { num.textContent = Math.round(n.v) },
    onComplete: () => {
      pre.classList.add('done')
      document.body.classList.remove('is-loading')
      document.body.classList.add('loaded')
      if (lenis) lenis.start()
      setTimeout(() => pre.remove(), 1000)
    },
  })
}
