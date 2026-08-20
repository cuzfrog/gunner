import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const profiles = JSON.parse(await readFile('data/ship-profiles.json', 'utf8'))
const outDir = 'tmp/ship-images/'

// Find the 47 failed ships that have zero-byte webp
const failedFiles = execFileSync('find', ['.', '-name', '*.webp', '-size', '0', '-exec', 'basename', '{}', ';'], {
  cwd: outDir,
  encoding: 'utf8'
}).trim().split('\n').map(f => f.replace('.webp', ''))

const failedSet = new Set(failedFiles)
const failedShips = profiles.filter(s => failedSet.has(s.name.replace(/ /g, '_')))

console.log(`Processing ${failedShips.length} ships - finding zKill type IDs and evetech URLs`)

const results = { downloaded: [], needManual: [] }

for (const ship of failedShips) {
  const pageTitle = ship.url.replace('https://wiki.eveuniversity.org/', '')

  try {
    const apiUrl = `https://wiki.eveuniversity.org/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json`
    const resp = execFileSync('curl', ['-sL', apiUrl], { encoding: 'utf8', timeout: 20000 })
    const data = JSON.parse(resp)
    const html = data.parse?.text?.['*'] || ''

    let imageUrl = null

    // Strategy 1: Find evetech.net render URL
    const evetechMatch = html.match(/https:\/\/images\.evetech\.net\/types\/(\d+)\/render/)
    if (evetechMatch) {
      imageUrl = `${evetechMatch[0]}`
    }

    // Strategy 2: Find zKillboard type ID and construct evetech.net URL
    if (!imageUrl) {
      const zkillMatch = html.match(/zkillboard\.com\/ship\/(\d+)/)
      if (zkillMatch) {
        const typeId = zkillMatch[1]
        imageUrl = `https://images.evetech.net/types/${typeId}/render/?size=256`
      }
    }

    // Strategy 3: Find wiki-hosted image (not icons/logos)
    if (!imageUrl) {
      const allUrls = [...new Set([...html.matchAll(/https:\/\/wiki\.eveuniversity\.org\/images\/[^\s"'<>]+/)]
        .map(m => m[0].replace(/&amp;/g, '&')))]
      for (const url of allUrls) {
        if (url.includes('/thumb/') &&
            !url.includes('Icon_') && !url.includes('Isis_') && !url.includes('Logo_') &&
            !url.includes('Corner') && !url.includes('UniWiki') && !url.includes('No-image')) {
          imageUrl = url.replace('/thumb/', '/').replace(/\/\d+px-/, '/')
          break
        }
      }
    }

    if (imageUrl) {
      console.log(`  ${ship.name}: ${imageUrl}`)
      results.downloaded.push({ name: ship.name, imageUrl, safeName: ship.name.replace(/ /g, '_') })
      // Download the image
      const outPath = `${outDir}${ship.name.replace(/ /g, '_')}.jpg`
      execFileSync('curl', ['-sL', '-o', outPath, '-w', '%{http_code}', imageUrl], {
        timeout: 15000,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      console.log(`    Downloaded to ${outPath}`)
    } else {
      console.log(`  ${ship.name}: NEED MANUAL - no image source found`)
      results.needManual.push(ship.name)
    }
  } catch (err) {
    console.log(`  ${ship.name}: ERROR - ${err}`)
    results.needManual.push(ship.name)
  }
}

await writeFile(outDir + 'remaining-urls.json', JSON.stringify(results, null, 2))
console.log(`\nDownloaded ${results.downloaded.length} images, ${results.needManual.length} need manual handling`)
console.log(`Manual: ${results.needManual.join(', ')}`)
