import '../styles/gallery.css'
import gsap from 'gsap'
import { Observer } from 'gsap/Observer'

gsap.registerPlugin(Observer)

const arrangements = ['grid', 'row', 'coverflow', 'barrel', 'helix', 'sphere']

function spherePoint(index, count) {
  const y = 1 - 2 * (index + 0.5) / count
  const radius = Math.sqrt(1 - y * y)
  const angle = index * Math.PI * (3 - Math.sqrt(5))
  return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius }
}

export function createGallery(root, { group, reduced, onOpen }) {
  let arrangement = group.arrangement
  let active = group.photos.findIndex(photo => photo.original === group.cover)
  if (active < 0) active = 0
  let dragDistance = 0
  let dragStartScroll = 0
  let suppressClick = false
  let disposed = false
  let lastCardWidth = 0
  let lastCardHeight = 0
  let lastStageHeight = 0
  let lastLayout = ''
  let geometryKey = ''
  let stageSpace = 0
  root.innerHTML = `
    <div class="gallery-info mono"><span class="gallery-hint"></span><span class="gallery-position" role="status" aria-live="polite"></span><div class="gallery-navigation"><button type="button" data-step="-1" aria-label="Previous photograph">←</button><button type="button" data-step="1" aria-label="Next photograph">→</button></div></div>
    <div class="gallery-stage" tabindex="0" role="region" aria-label="${group.title} photographs. Use arrow keys to browse.">
      ${group.photos.map((photo, i) => `<button type="button" class="gallery-photo" data-gallery-photo="${i}" aria-label="Open photograph ${i + 1} of ${group.photos.length}"><img draggable="false" src="${photo.src}" width="${photo.width}" height="${photo.height}" alt="" decoding="async" loading="${i < 4 || Math.abs(i - active) < 3 ? 'eager' : 'lazy'}"><span class="mono">${String(i + 1).padStart(2, '0')} / ${group.number}</span></button>`).join('')}
    </div>
    <div class="gallery-footer"><button type="button" class="back-button mono" data-close-collection>← BACK <span>TO THE ARCHIVE</span></button><div class="gallery-layouts" role="group" aria-label="Gallery arrangement">${arrangements.map(name => `<button type="button" class="mono" data-arrangement="${name}" aria-pressed="${name === arrangement}">${name}</button>`).join('')}</div></div>`

  const stage = root.querySelector('.gallery-stage')
  const scrollContainer = root.closest('dialog')
  const cards = [...root.querySelectorAll('.gallery-photo')]
  const position = root.querySelector('.gallery-position')
  const hint = root.querySelector('.gallery-hint')

  function render(animate = true) {
    if (disposed) return
    const flat = arrangement === 'grid' || reduced.matches
    root.dataset.arrangement = flat ? 'grid' : arrangement
    const width = stage.clientWidth
    const columns = width < 600 ? 2 : width < 1000 ? 3 : 4
    const gap = width < 600 ? 14 : 28
    const nextGeometryKey = `${width}:${scrollContainer.clientHeight}:${flat}`
    if (geometryKey !== nextGeometryKey) {
      const stageTop = stage.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop
      stageSpace = Math.max(220, scrollContainer.clientHeight - stageTop - 8)
      geometryKey = nextGeometryKey
    }
    const cardWidth = flat ? (width - gap * (columns - 1)) / columns : Math.min(width * 0.7, 600, Math.max(140, (stageSpace - 40) / 1.25))
    const cardHeight = cardWidth * 1.25
    const height = flat ? Math.ceil(cards.length / columns) * (cardHeight + 38) : Math.max(cardHeight + 30, stageSpace)
    const sizeChanged = cardWidth !== lastCardWidth || cardHeight !== lastCardHeight
    if (height !== lastStageHeight) stage.style.height = `${height}px`
    const layoutKey = `${arrangement}:${flat}:${active}`
    if (layoutKey !== lastLayout) {
      root.querySelectorAll('button[data-arrangement]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.arrangement === (flat ? 'grid' : arrangement)))
        button.disabled = reduced.matches && button.dataset.arrangement !== 'grid'
      })
      root.querySelector('.gallery-navigation').hidden = flat
      root.querySelector('[data-step="-1"]').disabled = active === 0
      root.querySelector('[data-step="1"]').disabled = active === cards.length - 1
      position.textContent = flat ? `${cards.length} PHOTOGRAPHS` : `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`
      hint.textContent = flat ? 'SCROLL TO EXPLORE / SELECT TO VIEW' : 'DRAG TO EXPLORE / SELECT TO VIEW'
      lastLayout = layoutKey
    }
    const progress = arrangement === 'sphere' && !flat
      ? gsap.utils.clamp(0, cards.length - 1, active - dragDistance / (cardWidth + gap))
      : active
    const first = spherePoint(Math.floor(progress), cards.length)
    const second = spherePoint(Math.ceil(progress), cards.length)
    const blend = progress - Math.floor(progress)
    const focus = {
      x: first.x + (second.x - first.x) * blend,
      y: first.y + (second.y - first.y) * blend,
      z: first.z + (second.z - first.z) * blend,
    }
    const yaw = Math.atan2(focus.x, focus.z)
    const pitch = Math.atan2(focus.y, Math.hypot(focus.x, focus.z))
    cards.forEach((card, i) => {
      const distance = i - active + (flat ? 0 : dragDistance / (cardWidth + gap))
      let x = width / 2 - cardWidth / 2
      let y = (height - cardHeight) / 2
      let z = 0
      let rotationY = 0
      let scale = 1
      let opacity = 1
      if (flat) {
        x = (i % columns) * (cardWidth + gap)
        y = Math.floor(i / columns) * (cardHeight + 38)
      } else if (arrangement === 'row') {
        x += distance * (cardWidth + gap)
        scale = 1 - 0.08 * Math.min(1, Math.abs(distance))
        opacity = gsap.utils.clamp(0, 1, 3 - Math.abs(distance))
      } else if (arrangement === 'coverflow') {
        x += Math.sign(distance) * Math.min(Math.abs(distance), 5) * cardWidth * 0.58
        z = -Math.abs(distance) * cardWidth * 0.45
        rotationY = -48 * gsap.utils.clamp(-1, 1, distance)
        opacity = gsap.utils.clamp(0, 1, 5 - Math.abs(distance))
      } else if (arrangement === 'barrel') {
        const angle = distance * 0.48
        const radius = Math.min(width * 0.7, 680)
        x += Math.sin(angle) * radius
        z = (Math.cos(angle) - 1) * radius
        rotationY = -distance * 27.5
        opacity = gsap.utils.clamp(0, 1, 4 - Math.abs(distance))
      } else if (arrangement === 'helix') {
        const angle = distance * 0.85
        const radius = Math.min(width * 0.58, 600)
        x += Math.sin(angle) * radius
        y += distance * cardHeight * 0.22
        z = (Math.cos(angle) - 1) * radius * 0.8
        rotationY = -Math.sin(angle) * 35
        scale = 0.65 + 0.35 * Math.exp(-Math.abs(distance))
        opacity = gsap.utils.clamp(0, 1, 6 - Math.abs(distance))
      } else if (arrangement === 'sphere') {
        const point = spherePoint(i, cards.length)
        const side = point.x * Math.cos(yaw) - point.z * Math.sin(yaw)
        const depth = point.x * Math.sin(yaw) + point.z * Math.cos(yaw)
        const vertical = point.y * Math.cos(pitch) - depth * Math.sin(pitch)
        const forward = point.y * Math.sin(pitch) + depth * Math.cos(pitch)
        const front = forward
        x += side * Math.min(width * 0.46, 580)
        y -= vertical * height * 0.36
        z = (front - 1) * Math.min(width * 0.5, 500)
        scale = 0.36 + 0.64 * Math.pow(Math.max(0, front), 5)
        opacity = 0.3 + 0.7 * Math.max(0, front)
      }
      if (sizeChanged) {
        if (animate && !reduced.matches && lastCardWidth > 0) {
          const scaleX = gsap.getProperty(card, 'scaleX')
          const scaleY = gsap.getProperty(card, 'scaleY')
          card.style.width = `${cardWidth}px`
          card.style.height = `${cardHeight + 25}px`
          gsap.set(card, { scaleX: scaleX * lastCardWidth / cardWidth, scaleY: scaleY * (lastCardHeight + 25) / (cardHeight + 25) })
        } else {
          card.style.width = `${cardWidth}px`
          card.style.height = `${cardHeight + 25}px`
        }
      }
      card.style.zIndex = String(Math.round(1000 + z - Math.abs(distance)))
      card.tabIndex = flat || i === active ? 0 : -1
      card.inert = opacity === 0
      const properties = {
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotationY}deg) scale(${scale})`,
        opacity,
        overwrite: true,
      }
      if (animate && !reduced.matches) gsap.to(card, { ...properties, duration: 0.65, ease: 'power3.out' })
      else gsap.set(card, properties)
    })
    lastCardWidth = cardWidth
    lastCardHeight = cardHeight
    lastStageHeight = height
  }
  function step(direction, animate = true) {
    active = Math.max(0, Math.min(cards.length - 1, active + direction))
    render(animate)
  }
  function onClick(event) {
    const layoutButton = event.target.closest('button[data-arrangement]')
    if (layoutButton) {
      arrangement = layoutButton.dataset.arrangement
      render(event.detail !== 0)
      return
    }
    const stepButton = event.target.closest('[data-step]')
    if (stepButton) { step(Number(stepButton.dataset.step), event.detail !== 0); return }
    const photo = event.target.closest('[data-gallery-photo]')
    if (!photo || (suppressClick && event.detail !== 0)) return
    const index = Number(photo.dataset.galleryPhoto)
    if (arrangement !== 'grid' && !reduced.matches && active !== index) {
      active = index
      render(event.detail !== 0)
    } else onOpen(index)
  }
  function onKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') active = 0
    else if (event.key === 'End') active = cards.length - 1
    else active = Math.max(0, Math.min(cards.length - 1, active + (event.key === 'ArrowRight' ? 1 : -1)))
    render(false)
    cards[active].focus({ preventScroll: true })
    if (arrangement === 'grid' || reduced.matches) cards[active].scrollIntoView({ block: 'nearest' })
  }
  const preventNativeDrag = event => event.preventDefault()
  root.addEventListener('click', onClick)
  stage.addEventListener('dragstart', preventNativeDrag)
  stage.addEventListener('keydown', onKeydown)
  const observer = Observer.create({
    target: stage,
    type: 'pointer,touch',
    dragMinimum: 8,
    lockAxis: true,
    onPress: () => {
      dragDistance = 0
      dragStartScroll = scrollContainer.scrollTop
      suppressClick = false
    },
    onDrag: self => {
      if (arrangement === 'grid' || reduced.matches) {
        if (self.axis === 'y' && self.event.pointerType !== 'touch') {
          scrollContainer.scrollTop = dragStartScroll - (self.y - self.startY)
        }
      } else if (self.axis === 'x') {
        dragDistance = self.x - self.startX
        render(false)
      }
    },
    onRelease: (self, wasDragged) => {
      const distance = dragDistance
      dragDistance = 0
      suppressClick = wasDragged
      if (arrangement !== 'grid' && !reduced.matches && Math.abs(distance) > 30) {
        const cardWidth = cards[active].offsetWidth
        const gap = stage.clientWidth < 600 ? 14 : 28
        const steps = Math.max(1, Math.round(Math.abs(distance) / (cardWidth + gap)))
        step(distance < 0 ? steps : -steps)
      } else if (arrangement !== 'grid' && !reduced.matches) {
        render()
      }
    },
  })
  const resize = new ResizeObserver(() => render(false))
  resize.observe(stage)
  reduced.addEventListener('change', onReducedChange)
  function onReducedChange() { lastLayout = ''; render(false) }
  render(false)
  return {
    getActiveImage() { return cards[active].querySelector('img') },
    destroy() {
      disposed = true
      observer.kill()
      resize.disconnect()
      reduced.removeEventListener('change', onReducedChange)
      gsap.killTweensOf(cards)
      root.removeEventListener('click', onClick)
      stage.removeEventListener('keydown', onKeydown)
      stage.removeEventListener('dragstart', preventNativeDrag)
    },
  }
}
