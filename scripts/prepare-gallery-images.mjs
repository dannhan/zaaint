import { mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import sharp from 'sharp'

const photos = JSON.parse(await readFile(new URL('../src/data/photos.json', import.meta.url), 'utf8')).flat()
for (const photo of photos) {
  const source = new URL(`../public${photo.src}`, import.meta.url)
  const destination = new URL(`../public${photo.src.replace('/photos/', '/previews/')}`, import.meta.url)
  await mkdir(dirname(destination.pathname), { recursive: true })
  await sharp(source.pathname).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 82 }).toFile(destination.pathname)
}
console.log(`Prepared ${photos.length} gallery previews with the full photographic canvas.`)
