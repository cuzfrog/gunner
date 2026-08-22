import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const profiles = JSON.parse(await readFile('data/ship-profiles.json', 'utf8'))
const outDir = 'tmp/ship-images/'

// Get list of zero-byte (failed) webp files
const failedFiles = execFileSync('find', ['.', '-name', '*.webp', '-size', '0', '-exec', 'basename', '{}', ';'], {
  cwd: outDir,
  encoding: 'utf8'
}).trim().split('\n').map(f => f.replace('.webp', ''))

const failedSet = new Set(failedFiles)
const failedShips = profiles.filter(s => failedSet.has(s.name.replace(/ /g, '_')))

console.log(`Processing ${failedShips.length} failed ships`)

const results = { found: [], notFound: [] }

for (const ship of failedShips) {
  const pageTitle = ship.url.replace('https://wiki.eveuniversity.org/', '')

  try {
    const apiUrl = `https://wiki.eveuniversity.org/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json`
    const resp = execFileSync('curl', ['-sL', apiUrl], { encoding: 'utf8', timeout: 15000 })
    const data = JSON.parse(resp)
    const html = data.parse?.text?.['*'] || ''

    // Fix: use \s (not \\s) in regex - \\s excludes letter 's'
    const allUrls = [...new Set([...html.matchAll(/https?:\/\/[^"<>\s&]+/g)].map(m => m[0].replace(/&amp;/g, '&')))]

    let imageUrl = null
    // Priority 1: evetech.net render images (size=256 preferred)
    const evetechUrls = allUrls.filter(u => u.includes('evetech.net') && u.includes('render'))
    if (evetechUrls.length > 0) {
      // Prefer size=256
      const size256 = evetechUrls.find(u => u.includes('size=256'))
      imageUrl = size256 || evetechUrls[0]
    }

    // Priority 2: wiki-hosted ship images (thumbnails)
    if (!imageUrl) {
      for (const url of allUrls) {
        if (url.includes('/images/') && url.includes('/thumb/') &&
            !url.includes('Icon_') && !url.includes('Isis_') && !url.includes('Logo_') &&
            !url.includes('Corner') && !url.includes('UniWiki')) {
          imageUrl = url.replace('/thumb/', '/').replace(/\/\d+px-/, '/')
          break
        }
      }
    }

    if (imageUrl) {
      results.found.push({ name: ship.name, imageUrl })
      console.log(`  ${ship.name}: ${imageUrl}`)
    } else {
      results.notFound.push(ship.name)
      console.log(`  ${ship.name}: NO IMAGE FOUND`)
    }
  } catch (err) {
    results.notFound.push(ship.name)
    console.log(`  ${ship.name}: ERROR - ${err}`)
  }
}

await writeFile(outDir + 'failed-image-urls.json', JSON.stringify(results, null, 2))
console.log(`\nFound ${results.found.length} image URLs, ${results.notFound.length} ships need alternative`)
