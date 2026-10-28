import './styles/main.css'
import photos from './data/photos.json'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createGallery } from './js/gallery.js'

gsap.registerPlugin(ScrollTrigger)
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
const groups = [
  { title: 'The gathering', arrangement: 'sphere', type: 'DOCUMENTARY', cover: '61pvi7w7aqpe.jpg', description: 'People, presence, and the spaces between.' },
  { title: 'The players', arrangement: 'coverflow', type: 'PORTRAIT', cover: '7f9zc3p63qur.jpg', description: 'A series of portraits in the last light.' },
  { title: 'In the streets', arrangement: 'helix', type: 'DOCUMENTARY', cover: '993bsi5pyd3x.jpg', description: 'Scenes from a crowd in motion.' },
  { title: 'A portrait', arrangement: 'coverflow', type: 'PORTRAIT', cover: 'DZSNIX5D6-T.jpg', description: 'A person, a place, a moment.' },
  { title: 'Elsewhere', arrangement: 'grid', type: 'PLACES', cover: 'DZH8U73iRxa-3.jpg', description: 'A collection of places and small things.' },
  { title: 'After dark', arrangement: 'barrel', type: 'LIVE MUSIC', cover: 'DSDL53pEmWl-13.jpg', description: 'On stage, in the light.' },
].map((group, i) => ({ ...group, photos: photos[i], number: String(i + 1).padStart(2, '0') }))

const collections = document.querySelector('#collections')
const collectionDialog = document.querySelector('#collection-dialog')
const viewer = document.querySelector('#viewer')
const viewerImage = document.querySelector('#viewer-image')
let activeGroup = null
let activePhoto = 0
let lenis
let gallery = null
let collectionTransition = null

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
  const sourceImage = button.querySelector('.collection-image img')
  const sourceRect = sourceImage.getBoundingClientRect()
  activeGroup = groups[index]
  document.querySelector('#collection-number').textContent = `(${activeGroup.number}) / ${activeGroup.type}`
  document.querySelector('#collection-title').textContent = activeGroup.title
  document.querySelector('#collection-count').textContent = `${String(activeGroup.photos.length).padStart(2, '0')} PHOTOGRAPHS`
  collectionDialog.showModal()
  collectionDialog.scrollTop = 0
  lenis?.stop()
  gallery?.destroy()
  gallery = createGallery(document.querySelector('#photo-grid'), {
    group: activeGroup,
    reduced,
    onOpen: index => { showPhoto(index); viewer.showModal() },
  })
  if (animateEntry && !reduced.matches) {
    animateCollection(sourceImage, sourceRect)
  }
}

function animateCollection(sourceImage, sourceRect) {
  const destination = gallery.getActiveImage()
  const box = destination.getBoundingClientRect()
  const ratio = activeGroup.photos.find(photo => photo.original === activeGroup.cover)
  const aspect = ratio ? ratio.width / ratio.height : sourceRect.width / sourceRect.height
  const width = Math.min(box.width, box.height * aspect)
  const height = width / aspect
  const target = { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height }
  const paper = document.createElement('div')
  paper.className = 'transition-paper'
  paper.setAttribute('aria-hidden', 'true')
  const image = sourceImage.cloneNode()
  image.className = 'transition-image'
  image.alt = ''
  image.setAttribute('aria-hidden', 'true')
  Object.assign(image.style, { left: `${sourceRect.left}px`, top: `${sourceRect.top}px`, width: `${sourceRect.width}px`, height: `${sourceRect.height}px` })
  collectionDialog.append(paper, image)
  collectionDialog.classList.add('is-entering')
  const content = collectionDialog.querySelector('.collection-dialog-inner')
  const bar = collectionDialog.querySelector('.dialog-bar')
  destination.style.visibility = 'hidden'
  const cleanup = () => {
    paper.remove()
    image.remove()
    destination.style.visibility = ''
    collectionDialog.classList.remove('is-entering')
    gsap.set([content, bar], { clearProps: 'opacity,transform' })
    collectionTransition = null
  }
  const initialClip = `inset(${Math.max(0, sourceRect.top)}px ${Math.max(0, window.innerWidth - sourceRect.right)}px ${Math.max(0, window.innerHeight - sourceRect.bottom)}px ${Math.max(0, sourceRect.left)}px)`
  collectionTransition = gsap.timeline({ onComplete: cleanup, onInterrupt: cleanup })
    .fromTo(paper, { clipPath: initialClip }, { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.75, ease: 'power3.inOut' })
    .to(image, { x: target.left - sourceRect.left, y: target.top - sourceRect.top, scaleX: target.width / sourceRect.width, scaleY: target.height / sourceRect.height, duration: 0.75, ease: 'power3.inOut' }, 0)
    .fromTo([bar, content], { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power3.out' }, 0.3)
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
document.querySelectorAll('[data-close-collection]').forEach(button => button.addEventListener('click', () => collectionDialog.close()))
document.querySelector('#viewer-close').addEventListener('click', () => viewer.close())
document.querySelector('#viewer-prev').addEventListener('click', () => showPhoto(activePhoto - 1))
document.querySelector('#viewer-next').addEventListener('click', () => showPhoto(activePhoto + 1))
collectionDialog.addEventListener('close', () => {
  if (collectionDialog.open) return
  collectionTransition?.kill()
  gallery?.destroy()
  gallery = null
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
