import gsap from 'gsap'

function contain(rect, aspect) {
  const width = Math.min(rect.width, rect.height * aspect)
  const height = width / aspect
  return { left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2, width, height }
}

function photoRect(image) {
  const width = Number(image.getAttribute('width')) || image.naturalWidth
  const height = Number(image.getAttribute('height')) || image.naturalHeight
  return contain(image.getBoundingClientRect(), width / height)
}

function visible(rect) {
  return rect.width > 1 && rect.height > 1 && rect.left < innerWidth && rect.top < innerHeight && rect.left + rect.width > 0 && rect.top + rect.height > 0
}

function displacement(from, to) {
  return {
    x: to.left + to.width / 2 - from.left - from.width / 2,
    y: to.top + to.height / 2 - from.top - from.height / 2,
    scaleX: to.width / from.width,
    scaleY: to.height / from.height,
  }
}

function clip(rect) {
  return `inset(${Math.max(0, rect.top)}px ${Math.max(0, innerWidth - rect.left - rect.width)}px ${Math.max(0, innerHeight - rect.top - rect.height)}px ${Math.max(0, rect.left)}px)`
}

export function createTransitions({ collectionDialog, viewer, viewerImage, reduced }) {
  let pending = null
  const surface = viewer.querySelector('.viewer-surface')
  const chrome = [viewer.querySelector('.viewer-bar'), viewer.querySelector('.viewer-controls')]

  function finish() { pending?.timeline.progress(1) }

  function run(host, build, cleanup) {
    let completed = false
    const operation = { host, timeline: null }
    const complete = () => {
      if (completed) return
      completed = true
      if (pending === operation) pending = null
      cleanup()
    }
    operation.timeline = gsap.timeline({ paused: true, onComplete: complete, onInterrupt: complete })
    pending = operation
    build(operation.timeline)
    operation.timeline.play()
  }

  function clearViewer() {
    gsap.set([viewerImage, surface, ...chrome], { clearProps: 'transform,opacity,transformOrigin' })
  }

  function clone(image, rect) {
    const copy = image.cloneNode()
    copy.removeAttribute('id')
    copy.className = 'transition-image'
    copy.alt = ''
    copy.loading = 'eager'
    copy.setAttribute('aria-hidden', 'true')
    copy.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;transform-origin:center;`
    collectionDialog.append(copy)
    return copy
  }

  window.addEventListener('resize', finish)
  window.addEventListener('pagehide', finish)
  reduced.addEventListener('change', finish)
  for (const dialog of [collectionDialog, viewer]) {
    dialog.addEventListener('close', () => {
      if (!dialog.open && pending?.host === dialog) finish()
    })
  }

  return {
    finish,
    openPhoto(source, animate) {
      finish()
      const from = photoRect(source)
      viewer.showModal()
      if (!animate || reduced.matches || !visible(from)) return
      const target = photoRect(viewerImage)
      const visibility = source.style.visibility
      source.style.visibility = 'hidden'
      run(viewer, timeline => {
        timeline.fromTo(surface, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power3.out' }, 0)
          .fromTo(viewerImage, { ...displacement(target, from), transformOrigin: '50% 50%' }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: 'power3.inOut' }, 0)
          .fromTo(chrome, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.18, stagger: 0.04, ease: 'power3.out' }, 0.22)
      }, () => {
        source.style.visibility = visibility
        clearViewer()
      })
    },
    closePhoto(destination, animate) {
      finish()
      if (!viewer.open) return
      const from = photoRect(viewerImage)
      const target = photoRect(destination)
      const close = () => {
        viewer.close()
        if (collectionDialog.open) destination.closest('button').focus({ preventScroll: true })
      }
      if (!animate || reduced.matches || !visible(target)) { close(); return }
      const visibility = destination.style.visibility
      destination.style.visibility = 'hidden'
      run(viewer, timeline => {
        timeline.to(chrome, { opacity: 0, y: -6, duration: 0.16, ease: 'power3.out' }, 0)
          .to(surface, { opacity: 0, duration: 0.4, ease: 'power3.inOut' }, 0)
          .to(viewerImage, { ...displacement(from, target), duration: 0.45, ease: 'power3.inOut' }, 0)
      }, () => {
        destination.style.visibility = visibility
        clearViewer()
        close()
      })
    },
    closeCollection(source, destination, animate) {
      finish()
      if (!collectionDialog.open) return
      const close = () => {
        collectionDialog.close()
        destination.closest('button').focus({ preventScroll: true })
      }
      if (!animate || reduced.matches) { close(); return }
      const target = photoRect(destination)
      const content = collectionDialog.querySelector('.collection-dialog-inner')
      const header = collectionDialog.querySelector('.collection-header')
      if (!visible(target)) {
        run(collectionDialog, timeline => {
          timeline.to(collectionDialog, { opacity: 0, duration: 0.2, ease: 'power3.out' })
        }, () => {
          gsap.set(collectionDialog, { clearProps: 'opacity' })
          close()
        })
        return
      }
      const from = photoRect(source)
      const sourceVisible = visible(from)
      const coverStart = contain(sourceVisible ? from : collectionDialog.getBoundingClientRect(), target.width / target.height)
      const paper = document.createElement('div')
      paper.className = 'transition-paper'
      paper.setAttribute('aria-hidden', 'true')
      collectionDialog.append(paper)
      const samePhoto = source.currentSrc === destination.currentSrc
      const outgoing = sourceVisible ? clone(source, from) : null
      const incoming = samePhoto && outgoing ? null : clone(destination, coverStart)
      const sourceVisibility = source.style.visibility
      const destinationVisibility = destination.style.visibility
      source.style.visibility = 'hidden'
      destination.style.visibility = 'hidden'
      collectionDialog.classList.add('is-leaving')
      run(collectionDialog, timeline => {
        timeline.to(header, { opacity: 0, y: -8, duration: 0.18, ease: 'power3.out' }, 0)
          .to(content, { opacity: 0, duration: 0.18, ease: 'power3.out' }, 0)
          .fromTo(paper, { clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: clip(target), duration: 0.5, ease: 'power3.inOut' }, 0)
        if (outgoing) {
          const outgoingTarget = contain(target, from.width / from.height)
          timeline.to(outgoing, { ...displacement(from, outgoingTarget), duration: 0.5, ease: 'power3.inOut' }, 0)
          if (incoming) timeline.to(outgoing, { opacity: 0, duration: 0.16, ease: 'power3.out' }, 0)
        }
        if (incoming) {
          timeline.set(incoming, { opacity: 0 }, 0)
            .to(incoming, { ...displacement(coverStart, target), duration: 0.5, ease: 'power3.inOut' }, 0)
            .to(incoming, { opacity: 1, duration: 0.18, ease: 'power3.out' }, 0.14)
        }
      }, () => {
        paper.remove()
        outgoing?.remove()
        incoming?.remove()
        source.style.visibility = sourceVisibility
        destination.style.visibility = destinationVisibility
        collectionDialog.classList.remove('is-leaving')
        gsap.set([header, content], { clearProps: 'opacity,transform' })
        close()
      })
    },
  }
}
