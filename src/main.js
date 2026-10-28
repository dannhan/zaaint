import './styles/main.css'
import photos from './data/photos.json'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
const groups = [
  { title: 'The gathering', type: 'DOCUMENTARY', cover: '61pvi7w7aqpe.jpg', description: 'People, presence, and the spaces between.' },
  { title: 'The players', type: 'PORTRAIT', cover: '7f9zc3p63qur.jpg', description: 'A series of portraits in the last light.' },
  { title: 'In the streets', type: 'DOCUMENTARY', cover: '993bsi5pyd3x.jpg', description: 'Scenes from a crowd in motion.' },
  { title: 'A portrait', type: 'PORTRAIT', cover: 'DZSNIX5D6-T.jpg', description: 'A person, a place, a moment.' },
  { title: 'Elsewhere', type: 'PLACES', cover: 'DZH8U73iRxa-3.jpg', description: 'A collection of places and small things.' },
  { title: 'After dark', type: 'LIVE MUSIC', cover: 'DSDL53pEmWl-13.jpg', description: 'On stage, in the light.' },
].map((group, i) => ({ ...group, photos: photos[i], number: String(i + 1).padStart(2, '0') }))

const collections = document.querySelector('#collections')
const collectionDialog = document.querySelector('#collection-dialog')
const viewer = document.querySelector('#viewer')
const viewerImage = document.querySelector('#viewer-image')
let activeGroup = null
let activePhoto = 0
let lenis
let titleFlight = null

collections.innerHTML = groups.map((group, i) => {
  const cover = group.photos.find(photo => photo.original === group.cover) || group.photos[0]
  return `<article class="collection collection-${i + 1}" data-reveal>
    <button class="collection-button" data-collection="${i}" aria-label="Open ${group.title}, ${group.photos.length} photographs">
      <span class="collection-image"><span class="collection-image-inner"><img src="${cover.src}" width="${cover.width}" height="${cover.height}" alt="" loading="lazy" decoding="async"></span><span class="image-action mono">VIEW SERIES ↗</span></span>
      <span class="collection-meta mono"><span>(${group.number}) &nbsp; ${group.type}</span><span>${String(group.photos.length).padStart(2, '0')} FRAMES</span></span>
      <span class="collection-title"><span class="collection-name">${group.title}</span><span aria-hidden="true">↗</span></span>
    </button><p class="collection-description">${group.description}</p>
  </article>`
}).join('')

function openCollection(index, button, animateEntry) {
  const source = button.querySelector('.collection-name')
  const sourceRect = source.getBoundingClientRect()
  const sourceStyle = getComputedStyle(source)
  activeGroup = groups[index]
  document.querySelector('#collection-number').textContent = `(${activeGroup.number}) / ${activeGroup.type}`
  document.querySelector('#collection-title').textContent = activeGroup.title
  document.querySelector('#collection-count').textContent = `${String(activeGroup.photos.length).padStart(2, '0')} PHOTOGRAPHS`
  document.querySelector('#photo-grid').innerHTML = activeGroup.photos.map((photo, i) => `<button class="photo-button" data-photo="${i}" aria-label="Open photograph ${i + 1} of ${activeGroup.photos.length}"><img src="${photo.src}" width="${photo.width}" height="${photo.height}" alt="" loading="lazy" decoding="async"><span class="mono">${String(i + 1).padStart(2, '0')} / ${activeGroup.number}</span></button>`).join('')
  collectionDialog.showModal()
  collectionDialog.scrollTop = 0
  lenis?.stop()
  if (animateEntry && !reduced.matches) {
    animateCollectionTitle(sourceRect, sourceStyle)
    gsap.fromTo('.collection-intro > :not(h2)', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power3.out', overwrite: true })
    gsap.fromTo('#photo-grid .photo-button:nth-child(-n+3)', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', overwrite: true })
  }
}
function animateCollectionTitle(sourceRect, sourceStyle) {
  const title = document.querySelector('#collection-title')
  const targetRect = title.getBoundingClientRect()
  const targetStyle = getComputedStyle(title)
  const sourceSize = parseFloat(sourceStyle.fontSize)
  const targetSize = parseFloat(targetStyle.fontSize)
  const scale = targetSize / sourceSize
  const startY = Math.min(Math.max(sourceRect.top, 16), window.innerHeight - sourceRect.height - 16)
  const flyingTitle = document.createElement('span')
  flyingTitle.className = 'title-flight'
  flyingTitle.setAttribute('aria-hidden', 'true')
  flyingTitle.textContent = activeGroup.title
  Object.assign(flyingTitle.style, {
    left: `${sourceRect.left}px`,
    top: `${startY}px`,
    width: `${targetRect.width / scale}px`,
    fontSize: `${sourceSize}px`,
    lineHeight: `${parseFloat(targetStyle.lineHeight) / scale}px`,
  })
  collectionDialog.append(flyingTitle)
  title.style.visibility = 'hidden'
  const finish = () => {
    title.style.visibility = ''
    flyingTitle.remove()
    titleFlight = null
  }
  titleFlight = gsap.to(flyingTitle, {
    x: targetRect.left - sourceRect.left,
    y: targetRect.top - startY,
    scale,
    duration: 0.7,
    ease: 'power3.inOut',
    onComplete: finish,
    onInterrupt: finish,
  })
}
function showPhoto(index) {
  activePhoto = (index + activeGroup.photos.length) % activeGroup.photos.length
  const photo = activeGroup.photos[activePhoto]
  viewerImage.src = photo.src
  viewerImage.alt = `Photograph ${activePhoto + 1} from ${activeGroup.title}`
  document.querySelector('#viewer-label').textContent = activeGroup.title.toUpperCase()
  document.querySelector('#viewer-count').textContent = `${String(activePhoto + 1).padStart(2, '0')} / ${String(activeGroup.photos.length).padStart(2, '0')}`
}
collections.addEventListener('click', event => {
  const button = event.target.closest('[data-collection]')
  if (button) openCollection(Number(button.dataset.collection), button, event.detail !== 0)
})
document.querySelector('#photo-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-photo]')
  if (!button) return
  showPhoto(Number(button.dataset.photo))
  viewer.showModal()
})
document.querySelectorAll('[data-close-collection]').forEach(button => button.addEventListener('click', () => collectionDialog.close()))
document.querySelector('#viewer-close').addEventListener('click', () => viewer.close())
document.querySelector('#viewer-prev').addEventListener('click', () => showPhoto(activePhoto - 1))
document.querySelector('#viewer-next').addEventListener('click', () => showPhoto(activePhoto + 1))
collectionDialog.addEventListener('close', () => {
  titleFlight?.kill()
  lenis?.start()
})
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') showPhoto(activePhoto - 1)
  if (event.key === 'ArrowRight') showPhoto(activePhoto + 1)
})

if (!reduced.matches) {
  lenis = new Lenis({ autoRaf: true })
  lenis.on('scroll', ScrollTrigger.update)
  const opening = document.createElement('div')
  opening.className = 'opening'
  opening.setAttribute('aria-hidden', 'true')
  opening.innerHTML = '<span class="opening-name">zaaint<span>.</span></span><span class="opening-label mono">PHOTOGRAPHS / SELECTED WORKS</span>'
  document.body.append(opening)
  window.setTimeout(() => opening.remove(), 2500)
  const entrance = gsap.timeline({ onComplete: () => opening.remove() })
  entrance.from('.opening-name', { yPercent: 30, opacity: 0, duration: 0.5, ease: 'power3.out' })
    .to(opening, { yPercent: -100, duration: 0.8, ease: 'power3.inOut', delay: 0.15 })
    .from('.hero-image-wrap', { opacity: 0, scale: 0.96, duration: 1.1, ease: 'power3.out' }, '-=0.5')
    .from('.hero-title-wrap > *', { opacity: 0, y: 30, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, '-=0.8')
  gsap.utils.toArray('[data-reveal]').forEach(element => {
    gsap.from(element, { opacity: 0, y: 55, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } })
    gsap.from(element.querySelector('.collection-image-inner'), { scale: 1.12, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } })
  })
  gsap.utils.toArray('.intro h2, .statement-text, .footer-link').forEach(element => {
    gsap.from(element, { opacity: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } })
  })
  gsap.to('.hero-image', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
  gsap.to('.asterisk', { rotation: 100, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true } })
}
