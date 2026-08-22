import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const profiles = JSON.parse(await readFile('data/ship-profiles.json', 'utf8'))
const outDir = 'tmp/ship-images/'
const results = []

for (const ship of profiles) {
  const name = ship.name
  const safeName = name.replace(/ /g, '_')
  const filename = `${safeName}.jpg`
  const hash = createHash('md5').update(filename).digest('hex')
  const dir1 = hash[0]
  const dir2 = hash.slice(0, 2)
  const encodedFilename = encodeURIComponent(filename).replace(/%20/g, '_')
  const url = `https://wiki.eveuniversity.org/images/${dir1}/${dir2}/${encodedFilename}`
  const outPath = `${outDir}${safeName}.jpg`

  try {
    execFileSync('curl', ['-sL', '-o', outPath, '-w', '%{http_code}', url], {
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    results.push({ name, status: 'ok', url })
  } catch {
    results.push({ name, status: 'fail', url })
  }
}

const failed = results.filter(r => r.status === 'fail')
const succeeded = results.filter(r => r.status === 'ok')
console.log(`Downloaded ${succeeded.length}/${results.length} images`)
if (failed.length > 0) {
  console.log(`Failed (${failed.length}): ${failed.map(f => f.name).join(', ')}`)
}
