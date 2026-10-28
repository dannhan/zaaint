const turn = Math.PI * 2
const degrees = 180 / Math.PI

export const wrap = (value, count) => ((value % count) + count) % count
export const nearestTurn = (angle, current) => current + wrap(angle - current + Math.PI, turn) - Math.PI

export function spherePoint(index, count) {
  const y = 1 - 2 * (index + 0.5) / count
  const radius = Math.sqrt(1 - y * y)
  const angle = index * Math.PI * (3 - Math.sqrt(5))
  return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius }
}

export function measureLayout(name, width, height, photo) {
  const gap = width < 600 ? 16 : 20
  const radius = Math.min(width * 0.47, height * 0.47)
  let cardHeight = Math.min(height - 24, width * (width < 600 ? 0.96 : 0.8) / (photo.width / photo.height))
  let cardWidth = cardHeight * photo.width / photo.height
  if (name === 'helix') {
    cardHeight = Math.min(height * 0.47, width * 0.66)
    cardWidth = cardHeight * photo.width / photo.height
  } else if (name === 'sphere') {
    cardHeight = Math.min(height * 0.46, width * 0.56)
    cardWidth = cardHeight * photo.width / photo.height
  } else if (name === 'grid') {
    cardWidth = Math.max(116, Math.min(210, width / 10.5))
    cardHeight = cardWidth * photo.height / photo.width
  }
  return {
    name, width, height, gap, cardWidth, cardHeight,
    radius: name === 'helix' ? Math.min(width * 0.43, cardWidth * 1.3) : radius,
    spacing: name === 'sphere' ? radius : name === 'helix' ? cardWidth * 0.9 : cardWidth + gap,
  }
}

export function spherePose(point, yaw, pitch) {
  const side = point.x * Math.cos(yaw) - point.z * Math.sin(yaw)
  const depth = point.x * Math.sin(yaw) + point.z * Math.cos(yaw)
  const vertical = point.y * Math.cos(pitch) - depth * Math.sin(pitch)
  const forward = point.y * Math.sin(pitch) + depth * Math.cos(pitch)
  return { side, vertical, forward }
}

export function panelPose(layout, index, count, motion, point) {
  const { name, width, height, cardWidth, cardHeight, radius, spacing } = layout
  let distance = index + motion.x / spacing
  let x = (width - cardWidth) / 2
  let y = (height - cardHeight) / 2
  let z = 0
  let rotationX = 0
  let rotationY = 0
  let scale = 1
  let opacity = 1
  let front = 1
  if (name === 'sphere') {
    const p = spherePose(point, -motion.x / spacing, motion.y / spacing)
    x += p.side * radius
    y -= p.vertical * radius
    z = (p.forward - 1) * radius
    rotationY = Math.atan2(p.side, p.forward) * degrees
    rotationX = Math.asin(Math.max(-1, Math.min(1, p.vertical))) * degrees
    opacity = 0.35 + 0.65 * Math.max(0, p.forward)
    front = p.forward
  } else if (name === 'helix') {
    distance = wrap(distance + count / 2, count) - count / 2
    const angle = distance * 0.9
    x += Math.sin(angle) * radius
    y += distance * cardHeight * 0.23 + motion.y
    z = (Math.cos(angle) - 1) * radius
    rotationY = angle * degrees
    opacity = 0.38 + 0.62 * (Math.cos(angle) + 1) / 2
    front = -Math.abs(distance)
  } else if (name === 'row') {
    x += distance * spacing
    scale = 1 - 0.08 * Math.min(1, Math.abs(distance))
    opacity = Math.max(0, Math.min(1, 3 - Math.abs(distance)))
    front = -Math.abs(distance)
  } else if (name === 'coverflow') {
    x += Math.sign(distance) * Math.min(Math.abs(distance), 5) * cardWidth * 0.58
    z = -Math.abs(distance) * cardWidth * 0.45
    rotationY = -48 * Math.max(-1, Math.min(1, distance))
    opacity = Math.max(0, Math.min(1, 5 - Math.abs(distance)))
    front = -Math.abs(distance)
  }
  return { x, y, z, rotationX, rotationY, scale, opacity, front }
}
