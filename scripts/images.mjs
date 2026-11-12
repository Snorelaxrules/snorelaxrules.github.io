// npm run images
// Reads originals from content/places-originals/<slug>/ and writes, for each one:
//   content/places/<slug>/<name>.webp        max 1600px long edge, quality 80
//   content/places/<slug>/<name>.thumb.webp  max 300px long edge
// Files whose outputs are already newer than the original are skipped.
// GPS positions are read from every original (before stripping) and saved to
// content/places/gps.json, rounded to 4 decimals (about 10 m), so places.json
// doesn't need lat/lng typed in by hand.
// sharp drops all metadata (EXIF, GPS, ICC) unless asked to keep it; .rotate()
// applies the EXIF orientation first so portrait phone photos stay upright.
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import exifr from 'exifr'
import { extname, join, parse } from 'node:path'
import sharp from 'sharp'

const SRC = 'content/places-originals'
const OUT = 'content/places'
const IMAGE = /\.(jpe?g|png|webp|heic|heif|tiff?|avif)$/i
const SIZES = [
  { suffix: '', edge: 1600, quality: 80 },
  { suffix: '.thumb', edge: 300, quality: 70 },
]

const mtime = async (p) => {
  try {
    return (await stat(p)).mtimeMs
  } catch {
    return 0
  }
}

const GPS_FILE = join(OUT, 'gps.json')
// keep positions for photos whose originals aren't on this machine (they're gitignored)
let gps = {}
try {
  gps = JSON.parse(await readFile(GPS_FILE, 'utf8'))
} catch {
  // first run
}
let made = 0
let skipped = 0
let failed = 0

let slugs = []
try {
  slugs = (await readdir(SRC, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
} catch {
  console.log(`No ${SRC}/ folder yet. Put originals in ${SRC}/<slug>/ and run again.`)
  process.exit(0)
}

for (const slug of slugs) {
  const files = (await readdir(join(SRC, slug))).filter((f) => IMAGE.test(f))
  if (!files.length) continue
  await mkdir(join(OUT, slug), { recursive: true })

  for (const file of files) {
    const src = join(SRC, slug, file)
    const srcTime = await mtime(src)
    const { name } = parse(file)
    delete gps[`${slug}/${file}`]
    try {
      const pos = await exifr.gps(src)
      if (pos && Number.isFinite(pos.latitude) && Number.isFinite(pos.longitude))
        gps[`${slug}/${file}`] = [+pos.latitude.toFixed(4), +pos.longitude.toFixed(4)]
    } catch {
      // no readable EXIF: fine, the photo just has no position
    }
    for (const { suffix, edge, quality } of SIZES) {
      const out = join(OUT, slug, `${name}${suffix}.webp`)
      if ((await mtime(out)) > srcTime) {
        skipped++
        continue
      }
      try {
        await sharp(src)
          .rotate()
          .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .toFile(out)
        made++
        console.log(`  ${out}`)
      } catch (err) {
        failed++
        console.error(`  failed: ${src} (${extname(file)}): ${err.message}`)
      }
    }
  }
}

const sorted = Object.fromEntries(Object.entries(gps).sort(([a], [b]) => a.localeCompare(b)))
await mkdir(OUT, { recursive: true })
await writeFile(GPS_FILE, `${JSON.stringify(sorted, null, 2)}\n`)
console.log(`gps: ${Object.keys(gps).length} photo${Object.keys(gps).length === 1 ? '' : 's'} with a location → ${GPS_FILE}`)
console.log(`images: ${made} written, ${skipped} up to date${failed ? `, ${failed} failed` : ''}`)
if (failed) process.exitCode = 1
