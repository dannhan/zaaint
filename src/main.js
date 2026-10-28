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

collections.innerHTML = groups.map((group, i) => {
  const cover = group.photos.find(photo => photo.original === group.cover) || group.photos[0]
  return `<article class="collection collection-${i + 1}" data-reveal>
    <button class="collection-button" data-collection="${i}" aria-label="Open ${group.title}, ${group.photos.length} photographs">
      <span class="collection-image"><img src="${cover.src}" width="${cover.width}" height="${cover.height}" alt="" loading="lazy" decoding="async"><span class="image-action mono">VIEW SERIES ↗</span></span>
      <span class="collection-meta mono"><span>(${group.number}) &nbsp; ${group.type}</span><span>${String(group.photos.length).padStart(2, '0')} FRAMES</span></span>
      <span class="collection-title">${group.title}<span>↗</span></span>
    </button><p class="collection-description">${group.description}</p>
  </article>`
}).join('')

function openCollection(index) {
  activeGroup = groups[index]
  document.querySelector('#collection-number').textContent = `(${activeGroup.number}) / ${activeGroup.type}`
  document.querySelector('#collection-title').textContent = activeGroup.title
  document.querySelector('#collection-count').textContent = `${String(activeGroup.photos.length).padStart(2, '0')} PHOTOGRAPHS`
  document.querySelector('#photo-grid').innerHTML = activeGroup.photos.map((photo, i) => `<button class="photo-button" data-photo="${i}" aria-label="Open photograph ${i + 1} of ${activeGroup.photos.length}"><img src="${photo.src}" width="${photo.width}" height="${photo.height}" alt="" loading="lazy" decoding="async"><span class="mono">${String(i + 1).padStart(2, '0')} / ${activeGroup.number}</span></button>`).join('')
  collectionDialog.showModal()
  lenis?.stop()
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
  if (button) openCollection(Number(button.dataset.collection))
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
collectionDialog.addEventListener('close', () => lenis?.start())
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') showPhoto(activePhoto - 1)
  if (event.key === 'ArrowRight') showPhoto(activePhoto + 1)
})

if (!reduced.matches) {
  lenis = new Lenis({ autoRaf: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.from('.hero-image-wrap', { opacity: 0, scale: 0.96, duration: 1.1, ease: 'power3.out' })
  gsap.from('.hero-title-wrap > *', { opacity: 0, y: 24, duration: 0.9, stagger: 0.08, delay: 0.15, ease: 'power3.out' })
  gsap.utils.toArray('[data-reveal]').forEach(element => gsap.from(element, { opacity: 0, y: 45, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } }))
  gsap.to('.hero-image', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
}
