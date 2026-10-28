import '../styles/gallery.css'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { measureLayout, nearestTurn, panelPose, spherePoint, spherePose, wrap } from './gallery-layouts'

gsap.registerPlugin(Draggable, InertiaPlugin)

const arrangements = ['grid', 'row', 'coverflow', 'helix', 'sphere']

export function createGallery(root, { group, reduced, onOpen }) {
  let arrangement = group.arrangement
  let active = Math.max(0, group.photos.findIndex(photo => photo.original === group.cover))
  let layout
  let drag
  let disposed = false
  let selectedCard = null
  let suppressClick = false
  let resizeFrame = 0
  let gridColumns = 0
  let focusCard = null
  let morph = null
  const count = group.photos.length
  const repeatCount = Math.ceil(18 / count) * count
  const motion = { x: 0, y: 0 }
  const proxy = document.createElement('div')
  const layoutSlot = root.closest('dialog').querySelector('.collection-layout-slot')
  layoutSlot.innerHTML = `<div class="gallery-layouts" role="group" aria-label="Gallery arrangement">${arrangements.map(name => `<button type="button" class="mono" data-arrangement="${name}" aria-pressed="${name === arrangement}">${name}</button>`).join('')}</div>`
  root.innerHTML = `
    <div class="gallery-stage" tabindex="0" role="region" aria-label="${group.title} photographs. Drag to explore, or use arrow keys to browse.">
      <div class="gallery-panels"></div><div class="gallery-tiles"></div>
    </div>
    <div class="gallery-footer mono"><span class="gallery-hint"></span><span class="gallery-position" role="status" aria-live="polite"></span><div class="gallery-navigation"><button type="button" data-step="-1" aria-label="Previous photograph">←</button><button type="button" data-step="1" aria-label="Next photograph">→</button></div></div>`

  const stage = root.querySelector('.gallery-stage')
  const panelsRoot = root.querySelector('.gallery-panels')
  const tilesRoot = root.querySelector('.gallery-tiles')
  const position = root.querySelector('.gallery-position')
  const hint = root.querySelector('.gallery-hint')
  const previous = root.querySelector('[data-step="-1"]')
  const next = root.querySelector('[data-step="1"]')
  const points = group.photos.map((_, index) => spherePoint(index, count))
  const panels = Array.from({ length: repeatCount }, (_, index) => makeCard(index % count, panelsRoot))
  const tilePositions = new Map()
  const poses = new Map()
  const tiles = []

  function makeCard(index, parent) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'gallery-photo'
    const image = document.createElement('img')
    image.draggable = false
    image.decoding = 'async'
    image.alt = ''
    button.append(image)
    setPhoto(button, index)
    parent.append(button)
    return button
  }

  function setPhoto(card, index) {
    if (card.dataset.galleryPhoto === String(index)) return
    const photo = group.photos[index]
    card.dataset.galleryPhoto = index
    card.setAttribute('aria-label', `Open photograph ${index + 1} of ${count}`)
    const image = card.firstElementChild
    image.src = photo.src
    image.srcset = `${photo.src.replace('/photos/', '/previews/')} 800w, ${photo.src} ${Math.min(1800, photo.width)}w`
    image.sizes = `${layout?.cardWidth || 400}px`
    image.width = photo.width
    image.height = photo.height
  }

  function updateActive(index) {
    if (active === index && position.textContent) return
    active = index
    position.textContent = `${String(active + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`
    const cyclic = ['grid', 'helix', 'sphere'].includes(layout.name)
    previous.disabled = !cyclic && active === 0
    next.disabled = !cyclic && active === count - 1
  }

  function setFocusCard(card) {
    if (card === focusCard) return
    if (focusCard) focusCard.tabIndex = -1
    card.tabIndex = 0
    focusCard = card
  }

  function draw() {
    if (disposed || !layout) return
    if (layout.name === 'grid') { drawGrid(); return }
    if (layout.name === 'static') return
    let foremost = -Infinity
    let frontCard = panels[active]
    const layers = []
    const panelCount = layout.name === 'helix' ? repeatCount : count
    panels.forEach((card, index) => {
      if (index >= panelCount) return
      const pose = panelPose(layout, index, panelCount, motion, points[index % count])
      const rendered = { ...pose, scaleX: pose.scale, scaleY: pose.scale }
      const from = morph?.from.get(card)
      if (from) {
        for (const property of ['x', 'y', 'z', 'rotationX', 'scaleX', 'scaleY', 'opacity']) {
          rendered[property] = from[property] + (rendered[property] - from[property]) * morph.progress
        }
        rendered.rotationY = from.rotationY + (wrap(pose.rotationY - from.rotationY + 180, 360) - 180) * morph.progress
      }
      poses.set(card, rendered)
      const { x, y, z, rotationX, rotationY, scaleX, scaleY, opacity } = rendered
      card.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${rotationY}deg) rotateX(${rotationX}deg) scale(${scaleX},${scaleY})`
      card.style.opacity = opacity
      layers.push({ card, z })
      if (card.inert !== (opacity < 0.01)) card.inert = opacity < 0.01
      if (pose.front > foremost) { foremost = pose.front; frontCard = card }
    })
    layers.sort((a, b) => a.z - b.z).forEach(({ card }, index) => {
      const layer = String(index + 1)
      if (card.style.zIndex !== layer) card.style.zIndex = layer
    })
    updateActive(Number(frontCard.dataset.galleryPhoto))
    setFocusCard(frontCard)
  }

  function drawGrid() {
    const { width, height, cardWidth, cardHeight, gap } = layout
    const cellWidth = cardWidth + gap
    const cellHeight = cardHeight + gap
    const startColumn = Math.floor((-motion.x - width / 2) / cellWidth)
    const startRow = Math.floor((-motion.y - height / 2) / cellHeight)
    let closest = Infinity
    let frontCard
    tiles.forEach((card, index) => {
      const rows = tiles.length / gridColumns
      const column = startColumn + wrap(index % gridColumns - startColumn, gridColumns)
      const row = startRow + wrap(Math.floor(index / gridColumns) - startRow, rows)
      const photo = wrap(column + row * 7, count)
      setPhoto(card, photo)
      const x = width / 2 + column * cellWidth + motion.x - cardWidth / 2
      const y = height / 2 + row * cellHeight + motion.y - cardHeight / 2
      const tile = tilePositions.get(card)
      tile.column = column
      tile.row = row
      tile.x = x
      tile.y = y
      card.style.transform = `translate3d(${x}px,${y}px,0)`
      const distance = (x + cardWidth / 2 - width / 2) ** 2 + (y + cardHeight / 2 - height / 2) ** 2
      if (distance < closest) { closest = distance; frontCard = card }
    })
    updateActive(Number(frontCard.dataset.galleryPhoto))
    setFocusCard(frontCard)
  }

  function stop() {
    gsap.killTweensOf(motion)
    drag?.tween?.kill()
  }

  function syncProxy() {
    gsap.set(proxy, { x: motion.x, y: motion.y })
    drag?.update()
  }

  function sphereTarget(index, currentX) {
    const point = points[index]
    return {
      x: -nearestTurn(Math.atan2(point.x, point.z), -currentX / layout.spacing) * layout.spacing,
      y: Math.atan2(point.y, Math.hypot(point.x, point.z)) * layout.spacing,
    }
  }

  function snapSphere(value) {
    let foremost = -Infinity
    let index = 0
    points.forEach((point, i) => {
      const { forward } = spherePose(point, -value.x / layout.spacing, value.y / layout.spacing)
      if (forward > foremost) { foremost = forward; index = i }
    })
    return sphereTarget(index, value.x)
  }

  function focusPhoto(index, animate = true) {
    stop()
    selectedCard = null
    const target = { x: motion.x, y: motion.y }
    if (layout.name === 'sphere') {
      Object.assign(target, sphereTarget(index, motion.x))
    } else if (layout.name === 'grid') {
      const card = gridImage(index)?.closest('button')
      if (card) {
        const { column, row } = tilePositions.get(card)
        target.x = -column * (layout.cardWidth + layout.gap)
        target.y = -row * (layout.cardHeight + layout.gap)
      } else {
        target.x = -index * (layout.cardWidth + layout.gap)
        target.y = 0
      }
    } else if (layout.name === 'helix') {
      const phase = -motion.x / layout.spacing
      target.x = -(phase + wrap(index - phase + count / 2, count) - count / 2) * layout.spacing
      target.y = 0
    } else if (layout.name === 'static') {
      updateActive(index)
      panels[index].scrollIntoView({ block: 'nearest', behavior: 'instant' })
      return
    } else target.x = -index * layout.spacing
    if (animate && !reduced.matches) {
      gsap.to(motion, { ...target, duration: 0.5, ease: 'power3.out', onUpdate: draw, onComplete: syncProxy })
    } else { Object.assign(motion, target); draw(); syncProxy() }
  }

  function gridImage(index) {
    let candidate = null
    let closest = Infinity
    for (const card of tiles) {
      if (Number(card.dataset.galleryPhoto) !== index) continue
      const { x, y } = tilePositions.get(card)
      const distance = (x + layout.cardWidth / 2 - layout.width / 2) ** 2 + (y + layout.cardHeight / 2 - layout.height / 2) ** 2
      if (distance < closest) { closest = distance; candidate = card.firstElementChild }
    }
    return candidate
  }

  function imageFor(index) {
    if (selectedCard?.isConnected && Number(selectedCard.dataset.galleryPhoto) === index && !selectedCard.hidden) return selectedCard.firstElementChild
    if (layout.name === 'grid') return gridImage(index)
    return panels.filter(card => !card.hidden && Number(card.dataset.galleryPhoto) === index)
      .sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0].firstElementChild
  }

  function configure(animate = false) {
    if (disposed) return
    const oldLayout = layout
    stop()
    if (morph) gsap.killTweensOf(morph)
    morph = null
    gsap.killTweensOf([panelsRoot, tilesRoot])
    gsap.set([panelsRoot, tilesRoot], { clearProps: 'opacity' })
    drag?.kill()
    stage.classList.remove('is-dragging')
    const name = reduced.matches ? 'static' : arrangement
    root.dataset.arrangement = name
    stage.scrollTop = 0
    const width = stage.clientWidth
    const height = stage.clientHeight
    layout = measureLayout(name, width, height, group.photos[active])
    if (animate === true && !reduced.matches && oldLayout && !['grid', 'static'].includes(oldLayout.name) && !['grid', 'static'].includes(name)) {
      const from = new Map()
      poses.forEach((pose, card) => from.set(card, {
        ...pose,
        x: pose.x + (oldLayout.cardWidth - layout.cardWidth) / 2,
        y: pose.y + (oldLayout.cardHeight - layout.cardHeight) / 2,
        scaleX: pose.scaleX * oldLayout.cardWidth / layout.cardWidth,
        scaleY: pose.scaleY * oldLayout.cardHeight / layout.cardHeight,
      }))
      morph = { progress: 0, from }
    }
    panelsRoot.hidden = name === 'grid'
    tilesRoot.hidden = name !== 'grid'
    focusCard = null
    panels.forEach((card, index) => {
      card.hidden = index >= (name === 'helix' ? repeatCount : count)
      card.inert = false
      card.tabIndex = -1
      card.style.width = `${layout.cardWidth}px`
      card.style.height = `${layout.cardHeight}px`
      card.firstElementChild.sizes = `${layout.cardWidth}px`
      if (name === 'static') {
        card.style.cssText = ''
        card.tabIndex = 0
        card.firstElementChild.sizes = '(max-width: 600px) 50vw, 240px'
      }
    })
    layoutSlot.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.arrangement === (name === 'static' ? 'grid' : name)))
      button.disabled = reduced.matches && button.dataset.arrangement !== 'grid'
    })
    hint.textContent = name === 'static' ? 'SCROLL TO EXPLORE / SELECT TO VIEW' : name === 'grid' ? 'DRAG IN ANY DIRECTION / SELECT TO VIEW' : 'DRAG TO EXPLORE / SELECT TO VIEW'
    position.textContent = ''
    if (name === 'grid') {
      gridColumns = Math.ceil(width / (layout.cardWidth + layout.gap)) + 3
      const rows = Math.ceil(height / (layout.cardHeight + layout.gap)) + 3
      while (tiles.length < gridColumns * rows) {
        const card = makeCard(0, tilesRoot)
        tilePositions.set(card, {})
        tiles.push(card)
      }
      while (tiles.length > gridColumns * rows) {
        const card = tiles.pop()
        tilePositions.delete(card)
        card.remove()
      }
      tiles.forEach(card => {
        card.style.width = `${layout.cardWidth}px`
        card.style.height = `${layout.cardHeight}px`
        card.firstElementChild.sizes = `${layout.cardWidth}px`
        card.tabIndex = -1
      })
    }
    if (oldLayout?.name === name) {
      motion.x *= layout.spacing / oldLayout.spacing
      motion.y *= name === 'sphere' ? layout.spacing / oldLayout.spacing : layout.cardHeight / oldLayout.cardHeight
    } else {
      motion.x = name === 'grid' ? -active * (layout.cardWidth + layout.gap) : 0
      motion.y = 0
      if (name !== 'grid') focusPhoto(active, false)
    }
    selectedCard = null
    draw()
    updateActive(active)
    if (name === 'static') return
    gsap.set(proxy, { x: motion.x, y: motion.y })
    const isOrbit = name === 'sphere' || name === 'helix'
    const twoAxes = isOrbit || name === 'grid'
    const bounds = name === 'sphere' ? { minY: -Math.PI / 2 * layout.spacing, maxY: Math.PI / 2 * layout.spacing }
      : name === 'helix' ? { minY: -layout.cardHeight * 0.7, maxY: layout.cardHeight * 0.7 }
        : name === 'grid' ? undefined : { minX: -(count - 1) * layout.spacing, maxX: 0 }
    const fromDrag = function () {
      motion.x = this.x
      motion.y = twoAxes ? this.y : 0
      selectedCard = null
      draw()
    }
    drag = Draggable.create(proxy, {
      trigger: stage, type: twoAxes ? 'x,y' : 'x', bounds,
      inertia: true, throwResistance: name === 'grid' ? 1500 : 2200,
      minDuration: 0.2, maxDuration: 0.8, overshootTolerance: 0,
      edgeResistance: 0.9, minimumMovement: 5, dragClickables: true,
      allowContextMenu: true, zIndexBoost: false,
      snap: name === 'sphere' ? { points: snapSphere }
        : name === 'grid' ? undefined
          : { x: value => Math.round(value / layout.spacing) * layout.spacing, ...(name === 'helix' ? { y: () => 0 } : {}) },
      onPressInit() { stop(); syncProxy(); suppressClick = false },
      onDragStart() { stage.classList.add('is-dragging'); suppressClick = true },
      onDrag: fromDrag, onThrowUpdate: fromDrag,
      onRelease() { stage.classList.remove('is-dragging') },
    })[0]
    if (morph) {
      gsap.to(morph, { progress: 1, duration: 0.5, ease: 'power3.inOut', onUpdate: draw, onComplete: () => { morph = null; draw() } })
    } else if (animate === true && !reduced.matches) {
      gsap.fromTo(name === 'grid' ? tilesRoot : panelsRoot, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power3.out' })
    }
  }

  function onClick(event) {
    const layoutButton = event.target.closest('button[data-arrangement]')
    if (layoutButton) {
      if (arrangement !== layoutButton.dataset.arrangement) { arrangement = layoutButton.dataset.arrangement; configure(event.detail !== 0) }
      return
    }
    const stepButton = event.target.closest('[data-step]')
    if (stepButton) {
      const index = active + Number(stepButton.dataset.step)
      focusPhoto(['grid', 'helix', 'sphere'].includes(layout.name) ? wrap(index, count) : Math.max(0, Math.min(count - 1, index)), event.detail !== 0)
      return
    }
    const card = event.target.closest('[data-gallery-photo]')
    if (!card || (suppressClick && event.detail !== 0)) return
    const index = Number(card.dataset.galleryPhoto)
    if (!['grid', 'static'].includes(layout.name) && index !== active) focusPhoto(index, event.detail !== 0)
    else {
      stop()
      selectedCard = card
      setFocusCard(card)
      updateActive(index)
      onOpen(index, event.detail !== 0)
    }
  }

  function onKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    let index = active + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1)
    if (event.key === 'Home') index = 0
    if (event.key === 'End') index = count - 1
    focusPhoto(['grid', 'helix', 'sphere'].includes(layout.name) ? wrap(index, count) : Math.max(0, Math.min(count - 1, index)), false)
    imageFor(active).closest('button').focus({ preventScroll: true })
  }

  const preventNativeDrag = event => event.preventDefault()
  root.addEventListener('click', onClick)
  layoutSlot.addEventListener('click', onClick)
  stage.addEventListener('dragstart', preventNativeDrag)
  stage.addEventListener('keydown', onKeydown)
  const resize = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      if (stage.clientWidth !== layout.width || stage.clientHeight !== layout.height) configure()
    })
  })
  reduced.addEventListener('change', configure)
  configure()
  resize.observe(stage)
  return {
    getActiveImage() { stop(); return imageFor(active) },
    getImage(index) { return imageFor(index) },
    reveal(index) {
      stop()
      if (layout.name !== 'grid' || !selectedCard || Number(selectedCard.dataset.galleryPhoto) !== index) focusPhoto(index, false)
      return imageFor(index)
    },
    destroy() {
      disposed = true
      stop()
      if (morph) gsap.killTweensOf(morph)
      gsap.killTweensOf([panelsRoot, tilesRoot])
      drag?.kill()
      resize.disconnect()
      cancelAnimationFrame(resizeFrame)
      reduced.removeEventListener('change', configure)
      root.removeEventListener('click', onClick)
      layoutSlot.removeEventListener('click', onClick)
      stage.removeEventListener('keydown', onKeydown)
      stage.removeEventListener('dragstart', preventNativeDrag)
    },
  }
}
