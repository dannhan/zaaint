/**
 * zaaint — lightbox
 * a11y-complete: dialog semantics, focus save/restore, keyboard, swipe.
 */
import { reduce } from './motion.js'

const lb = document.getElementById('lightbox')
const img = document.getElementById('lbImg')
const count = document.getElementById('lbCount')

let current = null   // active series object
let idx = 0
let lastFocus = null

const pad = (n) => (n < 10 ? '0' : '') + n

function show(i) {
  if (!current) return
  idx = (i + current.photos.length) % current.photos.length
  const p = current.photos[idx]
  img.src = p.src
  img.alt = `${current.title} — ${p.cap}`
  count.textContent = `${pad(idx + 1)} / ${pad(current.photos.length)}`
}

export function openLightbox(seriesObj, i, lenis) {
  current = seriesObj
  lastFocus = document.activeElement
  lb.hidden = false
  document.documentElement.style.overflow = 'hidden'
  if (lenis) lenis.stop()
  show(i)
  lb.focus?.()
}

export function closeLightbox(lenis) {
  if (lb.hidden) return
  lb.hidden = true
  document.documentElement.style.overflow = ''
  if (lenis) lenis.start()
  if (lastFocus) lastFocus.focus()
}

export function initLightbox(lenis) {
  lb.addEventListener('click', (e) => {
    if (e.target === img) return
    closeLightbox(lenis)
  })
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return
    if (e.key === 'Escape') closeLightbox(lenis)
    else if (e.key === 'ArrowRight') show(idx + 1)
    else if (e.key === 'ArrowLeft') show(idx - 1)
  })
  let sx = null
  lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX }, { passive: true })
  lb.addEventListener('touchend', (e) => {
    if (sx === null) return
    const dx = e.changedTouches[0].clientX - sx
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1))
    sx = null
  }, { passive: true })
}

export { reduce }
