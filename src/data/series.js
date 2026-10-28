/**
 * zaaint — content model
 *
 * One entry per photographic series. Titles/locations are PLACEHOLDERS until
 * real selects + metadata arrive (see research/RESEARCH.md §7).
 * When real photos land in public/photos/<series>/<n>.avif|.webp|.jpg,
 * flip `usePlaceholders` to false and the site serves local files.
 * `ar` = [w, h] aspect ratio per photo; drives the grid rhythm.
 */

export const site = {
  name: 'zaaint',
  role: 'photographer',
  tagline: 'people & places at golden hour',
  email: 'hello@zaaint.com',
  city: 'jakarta, indonesia',
  socials: [{ label: 'instagram', href: 'https://www.instagram.com/zaaaint/' }],
  morse: '--•• •- •• -•', // "ZAIN" — from the @zaaaint story highlights
}

/** flip to false once real files exist under public/photos/<id>/ */
export const usePlaceholders = true

/** deterministic warm dusk gradient per seed — swapped 1:1 by real files */
function PLACEHOLDER(seed, ar) {
  const [w, h] = ar
  const c = document.createElement('canvas')
  c.width = Math.min(w, 1600)
  c.height = Math.round(c.width * h / w)
  const x = c.getContext('2d')
  let q = seed * 7919
  const R = () => (q = (q * 9301 + 49297) % 233280) / 233280
  const H = 20 + R() * 30 // warm hues only: amber/sepia range
  const g = x.createLinearGradient(0, 0, 0, c.height)
  g.addColorStop(0, `hsl(${H + 35},45%,${72 + R() * 12}%)`)
  g.addColorStop(1, `hsl(${H},40%,${28 + R() * 14}%)`)
  x.fillStyle = g
  x.fillRect(0, 0, c.width, c.height)
  x.fillStyle = `hsl(${H + 40},70%,86%)`
  x.beginPath()
  x.arc(c.width * (0.2 + R() * 0.6), c.height * (0.22 + R() * 0.2), c.height * 0.09, 0, 7)
  x.fill()
  for (let i = 0; i < 3; i++) {
    x.fillStyle = `hsl(${H},30%,${16 - i * 4}%)`
    x.beginPath()
    x.moveTo(0, c.height)
    for (let t = 0; t <= 10; t++) x.lineTo((c.width * t) / 10, c.height * (0.6 + i * 0.12) - R() * c.height * 0.14)
    x.lineTo(c.width, c.height)
    x.fill()
  }
  return c.toDataURL('image/jpeg', 0.72)
}

const cache = {}
function src(seriesId, n, ar) {
  if (usePlaceholders) return ph(hash(seriesId) + n * 17, ar)
  const base = `/photos/${seriesId}/${n}`
  return `${base}.avif` // vite serves the file; <img> falls back via onerror in lightbox contexts
}

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** each series: 6 photos, mixed ratios, cover + hover-alt frame */
export const series = [
  {
    id: 'golden-hour-streets',
    title: 'golden hour streets',
    year: '2026',
    location: 'jakarta',
    format: '35mm film',
    cover: { n: 1, ar: [4, 5], alt: 2 },
    photos: [
      { n: 1, ar: [4, 5], cap: 'twilight jerseys, south jakarta' },
      { n: 2, ar: [4, 5], cap: 'opel era, saturday league' },
      { n: 3, ar: [1, 1], cap: 'flash on dusk' },
      { n: 4, ar: [3, 2], cap: 'market at last light' },
      { n: 5, ar: [4, 5], cap: 'bakso cart, blue hour' },
      { n: 6, ar: [16, 9], cap: 'last train, passing' },
    ],
  },
  {
    id: 'palm-dusk',
    title: 'palm dusk',
    year: '2022',
    location: 'anyer',
    format: 'digital',
    cover: { n: 1, ar: [1, 1], alt: 2 },
    photos: [
      { n: 1, ar: [1, 1], cap: 'palms at six' },
      { n: 2, ar: [1, 1], cap: 'contre-jour rooftops' },
      { n: 3, ar: [4, 5], cap: 'fronds, backlit' },
      { n: 4, ar: [16, 9], cap: 'cloud stack, amber' },
      { n: 5, ar: [1, 1], cap: 'low tide, silhouettes' },
      { n: 6, ar: [4, 5], cap: 'last light, west coast' },
    ],
  },
  {
    id: 'text-and-type',
    title: 'text & type',
    year: '2025',
    location: 'studio',
    format: 'digital',
    cover: { n: 1, ar: [4, 5], alt: 2 },
    photos: [
      { n: 1, ar: [4, 5], cap: 'letterform study i' },
      { n: 2, ar: [1, 1], cap: 'letterform study ii' },
      { n: 3, ar: [4, 5], cap: 'poster, one word' },
      { n: 4, ar: [3, 2], cap: 'signage, dusk' },
      { n: 5, ar: [4, 5], cap: 'grids and glyphs' },
      { n: 6, ar: [1, 1], cap: 'morse, mirrored' },
    ],
  },
]

export const indexOf = (id) => series.findIndex((s) => s.id === id)
export const nextOf = (id) => {
  const i = indexOf(id)
  return i === -1 ? null : series[(i + 1) % series.length]
}
