import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const profiles = JSON.parse(await readFile('data/ship-profiles.json', 'utf8'))
const outDir = 'tmp/ship-images/'

// Read the list of zero-byte (failed) webp files
const failedFiles = execFileSync('find', ['.', '-name', '*.webp', '-size', '0', '-exec', 'basename', '{}', ';'], {
  cwd: outDir,
  encoding: 'utf8',
}).trim().split('\n').map(f => f.replace('.webp', ''))

console.log(`Failed WebP count: ${failedFiles.length}`)

// Map failed filenames back to ship names
const failedShips = []
for (const profile of profiles) {
  const safeName = profile.name.replace(/ /g, '_')
  if (failedFiles.includes(safeName)) {
    failedShips.push(profile)
  }
}

console.log(`Failed ships: ${failedShips.map(s => s.name).join(', ')}`)

// Use MediaWiki API to get page image for each failing ship
// Build the titles list (pipe-separated, URL-encoded)
const titles = failedShips.map(s => s.url.replace('https://wiki.eveuniversity.org/', '')).join('|')

// Query the API for pageimages
const apiUrl = `https://wiki.eveuniversity.org/api.php?action=query&format=json&prop=pageimage&pithumbsize=500&titles=${encodeURIComponent(titles)}`

console.log(`API URL: ${apiUrl}`)

const response = execFileSync('curl', ['-sL', apiUrl], { encoding: 'utf8' })
const data = JSON.parse(response)

const pages = data.query.pages
const results = {}

for (const pageId in pages) {
  const page = pages[pageId]
  const title = page.title || pageId
  if (page.original) {
    results[title] = {
      hasImage: true,
      url: page.original.url,
      width: page.original.width,
      height: page.original.height,
    }
  } else if (page.pageimage) {
    results[title] = {
      hasImage: true,
      imageName: page.page.image,
      thumbUrl: page.thumb?.source,
    }
  } else {
    results[title] = { hasImage: false }
  }
}

console.log('Results:')
for (const [title, info] of Object.entries(results)) {
  console.log(`  ${title}: ${JSON.stringify(info)}`)
}

// Also extract ship type IDs from the wiki pages for evetech.net fallback
// Let's also check the markdown content for evetech.net URLs
console.log('\n--- Checking evetech.net URLs ---')
for (const ship of failedShips) {
  const pageUrl = ship.url
  const url = `${pageUrl}?action=raw`
  // Actually, let's use the API to get the imageinfo
}

// Save results for processing
import { writeFile } from 'node:fs/promises'
await writeFile(outDir + 'failed-ships-info.json', JSON.stringify(results, null, 2))
console.log('\nResults saved to failed-ships-info.json')
