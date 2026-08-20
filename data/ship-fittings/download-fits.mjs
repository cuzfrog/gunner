import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises'
import { constants } from 'node:fs'
import { execFile } from 'node:child_process'

const profiles = JSON.parse(await readFile('data/ship-profiles.json', 'utf8'))
const outDir = 'tmp/ship-fittings/'
const dataDir = outDir + 'data/'
const MIN_ITEMS = 5
const MAX_FITS = 4
const DELAY_MS = 500

function parseCsv(line) {
  const result = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else { inQ = !inQ }
    } else if (ch === ',' && !inQ) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

// Parse SDE data files
console.log('Loading SDE data...')
const typeCsv = await readFile(dataDir + 'invTypes.csv', 'utf8')
const typeMap = new Map()
for (const line of typeCsv.split('\n').slice(1)) {
  if (!line.trim()) continue
  const f = parseCsv(line)
  const typeID = parseInt(f[0])
  if (typeID && f[2]) typeMap.set(typeID, { name: f[2], groupID: parseInt(f[1]) })
}
console.log(`  ${typeMap.size} type IDs`)

const groupCsv = await readFile(dataDir + 'invGroups.csv', 'utf8')
const groupMap = new Map()
for (const line of groupCsv.split('\n').slice(1)) {
  if (!line.trim()) continue
  const f = parseCsv(line)
  groupMap.set(parseInt(f[0]), parseInt(f[1]))
}
console.log(`  ${groupMap.size} groups`)

// Build ship type ID lookup from SDE (category 6 = Ship)
const shipTypeID = new Map()
for (const [id, info] of typeMap) {
  if (groupMap.get(info.groupID) === 6 && info.name) {
    if (!shipTypeID.has(info.name)) shipTypeID.set(info.name, id)
  }
}

// zKillboard type IDs from wiki for ships not in SDE category6.
// Jove Directorate ships (Eidolon, Phantom, Specter, Visitant, Wraith) and
// the Angel Cartel Medusa are NPC-only — unavailable for player use, so they
// have no PvP killmail data on zKillboard. Removed from this map.
// Ixion (636) is not in the SDE and zKillboard returns0 losses — likely also
// NPC-only or type ID not recognized. Kept as best-available fallback.
const wikiTypeIDs = {
  Gecko: 33681,
  Ixion: 636,
}

// Map ship names from profiles to type IDs
const shipTypeIDByName = new Map()
for (const ship of profiles) {
  let tid = shipTypeID.get(ship.name)
  if (!tid && wikiTypeIDs[ship.name]) tid = wikiTypeIDs[ship.name]
  if (tid) shipTypeIDByName.set(ship.name, tid)
}

const missing = profiles.filter(s => !shipTypeIDByName.has(s.name))
console.log(`\nType IDs found: ${shipTypeIDByName.size}/${profiles.length}`)
if (missing.length) console.log('Missing (no type ID):', missing.map(s => s.name).join(', '))

// Flag ID -> EFT section (hardcoded)
function flagToSection(flag) {
  if (flag >= 27 && flag <= 34) return 'low'
  if (flag >= 19 && flag <= 26) return 'med'
  if (flag >= 11 && flag <= 18) return 'high'
  if (flag >= 92 && flag <= 94) return 'rig'
  if (flag >= 119 && flag <= 122) return 'subsystem'
  if (flag >= 136 && flag <= 139) return 'subsystem'
  if (flag === 157 || flag === 158 || (flag >= 204 && flag <= 208)) return 'drone'
  return 'cargo'
}

const CAT_MODULE = 7
const CAT_CHARGE = 8
const CAT_DRONE = 18

// Convert a zKillboard loss mail to EFT format
function killmailToEft(kill, shipName) {
  const items = kill.victim?.items
  if (!items) return null

  // Skip kills with no combat modules (only cargo/loot items)
  const hasCombatModule = items.some(item => {
    const f = item.flag
    if (f == null) return false
    if (f >= 11 && f <= 34) return true  // low/med/high
    if (f >= 92 && f <= 94) return true  // rig
    if ((f >= 119 && f <= 122) || (f >= 136 && f <= 139)) return true  // subsystem
    if (f === 157 || f === 158 || (f >= 204 && f <= 208)) return true  // drone
    return false
  })
  if (!hasCombatModule) return null

  // Group items by flag
  const byFlag = new Map()
  for (const item of items) {
    if (item.flag == null) continue
    if (!byFlag.has(item.flag)) byFlag.set(item.flag, [])
    byFlag.get(item.flag).push(item)
  }

  const sections = { low: [], med: [], high: [], rig: [], subsystem: [], drone: [], cargo: [] }

  for (const [flagStr, flagItems] of byFlag) {
    const flag = parseInt(flagStr)
    const section = flagToSection(flag)

    for (const item of flagItems) {
      const typeInfo = typeMap.get(item.item_type_id)
      if (!typeInfo) continue
      const catID = groupMap.get(typeInfo.groupID)
      const qty = Number(item.quantity_destroyed || 0) + Number(item.quantity_dropped || 0)
      if (qty <= 0 && catID !== CAT_DRONE) continue

      if (catID === CAT_MODULE && qty > 0) {
        // Find charge in the same flag
        const chargeItem = flagItems.find(i => {
          const ci = typeMap.get(i.item_type_id)
          if (!ci) return false
          const cc = groupMap.get(ci.groupID)
          const cq = Number(i.quantity_destroyed || 0) + Number(i.quantity_dropped || 0)
          return cc === CAT_CHARGE && i.item_type_id !== item.item_type_id && cq > 0
        })
        if (chargeItem) {
          const chargeInfo = typeMap.get(chargeItem.item_type_id)
          sections[section].push(`${typeInfo.name}, ${chargeInfo.name}`)
        } else {
          sections[section].push(typeInfo.name)
        }
      } else if (catID === CAT_CHARGE && section === 'cargo') {
        sections.cargo.push(`${typeInfo.name} x${qty}`)
      } else if (catID === CAT_DRONE) {
        sections.drone.push(`${typeInfo.name} x${qty}`)
      } else if (section === 'cargo' && qty > 0) {
        sections.cargo.push(`${typeInfo.name} x${qty}`)
      }
    }
  }

  // Build EFT text
  const secOrder = ['low', 'med', 'high', 'rig', 'subsystem', 'drone', 'cargo']
  const secType = { low: 'm', med: 'm', high: 'm', rig: 'm', subsystem: 'm', drone: 'd', cargo: 'c' }
  const nonEmpty = secOrder.filter(s => sections[s].length > 0)

  const lines = [`[${shipName}, Killmail ${kill.killmail_id}]`]
  if (nonEmpty.length === 0) {
    lines.push('')
    return lines.join('\n')
  }

  lines.push('') // blank after header
  lines.push(...sections[nonEmpty[0]])

  for (let i = 1; i < nonEmpty.length; i++) {
    const prev = secType[nonEmpty[i - 1]]
    const curr = secType[nonEmpty[i]]
    lines.push('') // first blank
    if (prev !== 'm' || curr !== 'm') {
      lines.push('') // second blank for module->non-module or non-module->anything
    }
    lines.push(...sections[nonEmpty[i]])
  }

  return lines.join('\n')
}

// Deduplication: compare sorted module configs
function fitSignature(eft) {
  const lines = eft.split('\n').filter(l => l && !l.startsWith('['))
  return lines.sort().join('|')
}

// Async curl fetch with retries
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const args = ['-sL', '-H', `User-Agent: ${UA}`, '-H', 'Accept: application/json', '--max-time', '20', url]
    let attempt = 0
    const maxRetries = 3
    const opts = { timeout: 25000, maxBuffer: 50 * 1024 * 1024 }

    const tryFetch = () => {
      execFile('curl', args, opts, (err, stdout, stderr) => {
        if (err && attempt < maxRetries) {
          attempt++
          setTimeout(tryFetch, 500 * attempt)
          return
        }
        if (err) { reject(err); return }
        try {
          const data = JSON.parse(stdout)
          resolve(Array.isArray(data) ? data : [])
        } catch (e) {
          if (attempt < maxRetries) {
            attempt++
            setTimeout(tryFetch, 500 * attempt)
            return
          }
          reject(new Error('Failed to parse response'))
        }
      })
    }
    tryFetch()
  })
}

// Fetch losses for a type ID (with kills fallback)
async function fetchLosses(typeID) {
  // Try losses endpoint first (returns only victim kills for this ship type)
  let kills = await fetchUrl(`https://zkillboard.com/api/losses/shipID/${typeID}/`)
  if (kills.length === 0) {
    // Fallback: use kills endpoint and filter by victim ship type
    const allKills = await fetchUrl(`https://zkillboard.com/api/kills/shipID/${typeID}/`)
    kills = allKills.filter(k => k.victim?.ship_type_id === typeID)
  }
  return kills
}

// Check if ship already has MAX_FITS fitting files
async function hasExistingFits(shipName) {
  const safeName = shipName.replace(/ /g, '_')
  const dir = `${outDir}${safeName}/`
  try {
    for (let j = 1; j <= MAX_FITS; j++) {
      await access(`${dir}fit-${j}.txt`, constants.F_OK)
    }
    return true
  } catch {
    return false
  }
}

// Process a single ship (skips if already has MAX_FITS fitting files)
async function processShip(ship) {
  const alreadyHas = await hasExistingFits(ship.name)
  if (alreadyHas) {
    return { ship: ship.name, status: 'skipped', fits: MAX_FITS }
  }

  const typeID = shipTypeIDByName.get(ship.name)
  const safeName = ship.name.replace(/ /g, '_')
  const shipDir = `${outDir}${safeName}/`

  if (!typeID) {
    return { ship: ship.name, status: 'no_type_id', fits: 0 }
  }

  try {
    const kills = await fetchLosses(typeID)
    if (!kills.length) {
      return { ship: ship.name, status: 'no_kills', fits: 0, typeID }
    }

    // Filter: PvP only, fitted ships (>MIN_ITEMS items)
    const pvpKills = kills.filter(k => !k.zkb?.npc && k.victim?.items?.length > MIN_ITEMS)
    if (!pvpKills.length) {
      return { ship: ship.name, status: 'no_pvp', fits: 0, typeID, total: kills.length }
    }

    // Convert to EFT, deduplicate
    const seen = new Set()
    const fits = []
    for (const kill of pvpKills) {
      const eft = killmailToEft(kill, ship.name)
      if (!eft) continue
      const sig = fitSignature(eft)
      if (seen.has(sig)) continue
      seen.add(sig)
      fits.push(eft)
      if (fits.length >= MAX_FITS) break
    }

    if (fits.length === 0) {
      return { ship: ship.name, status: 'no_fits', fits: 0, typeID, pvp: pvpKills.length }
    }

    await mkdir(shipDir, { recursive: true })
    // Clean old fittings before writing new ones
    for (let j = 1; j <= MAX_FITS; j++) {
      try { await unlink(`${shipDir}fit-${j}.txt`) } catch {}
    }
    for (let j = 0; j < fits.length; j++) {
      await writeFile(`${shipDir}fit-${j + 1}.txt`, fits[j])
    }
    return { ship: ship.name, status: 'ok', fits: fits.length, typeID, pvp: pvpKills.length }
  } catch (err) {
    return { ship: ship.name, status: 'error', fits: 0, error: err.message }
  }
}

// Process ships sequentially with delay to avoid zKillboard rate limiting
async function processShipsSequentially(ships) {
  const results = []
  for (let i = 0; i < ships.length; i++) {
    const r = await processShip(ships[i])
    if (r.fits > 0 && r.status !== 'skipped') {
      console.log(`  [${i + 1}/${ships.length}] ${r.ship}: ${r.fits} fits (${r.pvp || 0} PvP kills)`)
    } else if (r.status === 'skipped') {
      console.log(`  [${i + 1}/${ships.length}] ${r.ship}: skipped (already has fits)`)
    } else {
      console.log(`  [${i + 1}/${ships.length}] ${r.ship}: ${r.status}` + (r.error ? ' - ' + r.error : ''))
    }
    results.push(r)
    // Only delay between ships that actually hit the API (not skipped ones)
    if (r.status !== 'skipped' && i < ships.length - 1) await new Promise(res => setTimeout(res, DELAY_MS))
  }
  return results
}

// Main
console.log('\nProcessing ships...')
const startTime = Date.now()
const results = await processShipsSequentially(profiles)

const shipsWithFits = results.filter(r => r.fits > 0 && r.status !== 'skipped')
const skipped = results.filter(r => r.status === 'skipped')
const noTypeIds = results.filter(r => r.status === 'no_type_id')
const noData = results.filter(r => !['ok', 'skipped'].includes(r.status))

console.log(`\nResults: ${shipsWithFits.length + skipped.length}/${profiles.length} ships with fittings`)
console.log(` Skipped (existing): ${skipped.length}`)
console.log(` Processed new: ${shipsWithFits.length}`)
console.log(`Missing type ID: ${noTypeIds.length} (${noTypeIds.map(r => r.ship).join(', ')})`)
if (noData.length > 0) {
  const categorized = {}
  for (const r of noData) {
    if (!categorized[r.status]) categorized[r.status] = []
    categorized[r.status].push(r.ship + (r.total ? ` (${r.total} kills)` : '') + (r.typeID ? ` [tid:${r.typeID}]` : ''))
  }
  for (const [status, ships] of Object.entries(categorized)) {
    console.log(`No fits (${status}): ${ships.length} ships`)
    ships.forEach(s => console.log(`  ${s}`))
  }
}

const elapsed = Math.round((Date.now() - startTime) / 1000)
console.log(`\nDone in ${elapsed}s`)
