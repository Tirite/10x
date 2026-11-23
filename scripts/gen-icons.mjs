// Génère les icônes PNG de la PWA sans aucune dépendance externe
// (encodeur PNG minimal basé sur zlib, inclus dans Node).
//   docker compose run --rm dev npm run icons
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const BG = [11, 15, 26]
const BARS = [
  [99, 102, 241], // indigo
  [59, 130, 246], // bleu
  [16, 185, 129], // émeraude
]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filtre « none »
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Dessin : fond (arrondi ou plein pour les icônes maskable) + trois barres croissantes.
function draw(size, { maskable }) {
  const px = Buffer.alloc(size * size * 4)
  const radius = maskable ? 0 : size * 0.22
  // Zone de sécurité maskable : le motif tient dans les 80 % centraux.
  const inset = maskable ? size * 0.26 : size * 0.2
  const area = size - inset * 2
  const gap = area * 0.08
  const barW = (area - gap * 2) / 3

  const set = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = 255
  }

  const insideRounded = (x, y) => {
    if (radius === 0) return true
    const cx = Math.min(Math.max(x, radius), size - radius)
    const cy = Math.min(Math.max(y, radius), size - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!insideRounded(x + 0.5, y + 0.5)) continue
      set(x, y, BG)
    }
  }

  for (let b = 0; b < 3; b++) {
    const h = area * (0.42 + b * 0.29)
    const x0 = Math.round(inset + b * (barW + gap))
    const x1 = Math.round(x0 + barW)
    const y1 = Math.round(inset + area)
    const y0 = Math.round(y1 - h)
    const r = Math.max(2, barW * 0.3)
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        // coins arrondis en haut de chaque barre
        const dx = Math.min(x - x0, x1 - 1 - x)
        const dy = y - y0
        if (dy < r && dx < r && (r - dx) ** 2 + (r - dy) ** 2 > r ** 2) continue
        set(x, y, BARS[b])
      }
    }
  }
  return px
}

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  // iOS applique lui-même le masque arrondi : fond plein, motif centré.
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
]

for (const t of targets) {
  writeFileSync(join(OUT, t.file), encodePng(t.size, draw(t.size, t)))
  console.log('écrit', t.file, `${t.size}x${t.size}`)
}

writeFileSync(
  join(OUT, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0b0f1a"/>
  <rect x="13" y="34" width="10" height="17" rx="3" fill="#6366f1"/>
  <rect x="27" y="26" width="10" height="25" rx="3" fill="#3b82f6"/>
  <rect x="41" y="15" width="10" height="36" rx="3" fill="#10b981"/>
</svg>
`,
)
console.log('écrit favicon.svg')
