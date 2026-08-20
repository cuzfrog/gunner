import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const profiles = JSON.parse(await readFile('data/ship-profiles.json', 'utf8'))
const outDir = 'tmp/ship-images/'

// Strategy: for the failed ships, use the zKillboard type ID from the wiki page
// to construct the evetech.net render URL, or find the wiki-hosted image in HTML

const failedFiles = execFileSync('find', ['.', '-name', '*.webp', '-size', '0', '-exec', 'basename', '{}', ';'], {
  cwd: outDir,
  encoding: 'utf8'
}).trim().split('\n').map(f => f.replace('.webp', ''))

const failedSet = new Set(failedFiles)
const failedShips = profiles.filter(s => failedSet.has(s.name.replace(/ /g, '_')))

console.log(`Processing ${failedShips.length} failed ships - extracting type IDs from wiki pages`)

const results = { downloaded: [], failed: [] }

for (const ship of failedShips) {
  const pageTitle = ship.url.replace('https://wiki.eveuniversity.org/', '')

  try {
    // Fetch the wiki page text via MediaWiki API
    const apiUrl = `https://wiki.eveuniversity.org/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json`
    const resp = execFileSync('curl', ['-sL', apiUrl], { encoding: 'utf8', timeout: 20000 })
    const data = JSON.parse(resp)
    const html = data.parse?.text?.['*'] || ''

    // Strategy 1: Find evetech.net render URL
    const evetechMatch = html.match(/https:\/\/images\.evetech\.net\/types\/(\d+)\/render\/\?size=256[^"<>'\s]*/)
    if (evetechMatch) {
      const imageUrl = evetechMatch[0].replace(/&amp;/g, '&')
      results.downloaded.push({ name: ship.name, imageUrl, source: 'evetech' })
      console.log(`  ${ship.name}: evetech.net ${imageUrl}`)
      continue
    }

    // Strategy 2: Find zKillboard link and get type ID
    const zkillMatch = html.match(/zkillboard\.com\/ship\/(\d+)/)
    if (zkillMatch) {
      const typeId = zkillMatch[1]
      const imageUrl = `https://images.evetech.net/types/${typeId}/render/?size=256`
      results.downloaded.push({ name: ship.name, imageUrl, source: 'evetech-via-zkill' })
      console.log(`  ${ship.name}: evetech.net via zkill ${imageUrl}`)
      continue
    }

    // Strategy 3: Look for wiki-hosted ship image in HTML (not icons/logos)
    const allUrls = [...new Set([...html.matchAll(/https?:\/\/[^"<>\s&]+/g)].map(m => m[0].replace(/&amp;/g, '&')))]
    let wikiImage = null
    for (const url of allUrls) {
      if (url.includes('/images/') && url.includes('/thumb/') &&
          !url.includes('Icon_') && !url.includes('Isis_') && !url.includes('Logo_') &&
          !url.includes('Corner') && !url.includes('UniWiki')) {
        wikiImage = url.replace('/thumb/', '/').replace(/\/\d+px-/, '/')
        break
      }
    }
    if (wikiImage) {
      results.downloaded.push({ name: ship.name, imageUrl: wikiImage, source: 'wiki' })
      console.log(`  ${ship.name}: wiki image ${wikiImage}`)
      continue
    }

    results.failed.push(ship.name)
    console.log(`  ${ship.name}: NO IMAGE FOUND`)
  } catch (err) {
    results.failed.push(ship.name)
    console.log(`  ${ship.name}: ERROR - ${err}`)
  }
}

await writeFile(outDir + 'remaining-image-urls.json', JSON.stringify(results, null, 2))
console.log(`\nFound ${results.downloaded.length} image URLs, ${results.failed.length} ships still need images`)
