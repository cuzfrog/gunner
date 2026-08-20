import { execFileSync } from 'node:child_process'
import { readdir, unlink } from 'node:fs/promises'

const outDir = 'tmp/ship-images/'

// Clean up old webp files
const oldFiles = await readdir(outDir)
for (const f of oldFiles) {
  if (f.endsWith('.webp')) {
    await unlink(`${outDir}${f}`)
  }
}
console.log('Cleaned up old webp files')

// Find all source images
const sources = oldFiles.filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
console.log(`Found ${sources.length} source images to convert`)

let success = 0
let failed = 0

for (const src of sources) {
  const baseName = src.replace(/\.(jpg|png)$/, '')
  const srcPath = `${outDir}${src}`
  const webpPath = `${outDir}${baseName}.webp`

  try {
    execFileSync('ffmpeg', [
      '-y', '-i', srcPath,
      '-vf', 'scale=50:50:flags=lanczos',
      '-c:v', 'libwebp',
      webpPath
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000
    })

    // Verify the webp file was created and is valid
    const stats = await import('node:fs').then(fs => fs.statSync(webpPath))
    if (stats.size > 0) {
      success++
    } else {
      console.log(`  FAILED (0 bytes): ${baseName}`)
      failed++
    }
  } catch (err) {
    console.log(`  FAILED: ${baseName} - ${err.message}`)
    failed++
  }
}

console.log(`\nConverted ${success}/${sources.length} images to WebP 50x50`)
console.log(`Failed: ${failed}`)

// Clean up source files after successful conversion
const remaining = await readdir(outDir)
for (const f of remaining) {
  if (f.endsWith('.jpg') || f.endsWith('.png')) {
    await unlink(`${outDir}${f}`)
  }
}
console.log('Cleaned up source jpg/png files')

// Final count
const webpFiles = (await readdir(outDir)).filter(f => f.endsWith('.webp'))
console.log(`\nFinal: ${webpFiles.length} WebP files in ${outDir}`)
