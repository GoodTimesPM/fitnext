// Builds the exercise catalog the app loads at runtime from openGym's catalog folder.
//
//   node scripts/build-catalogue.mjs <openGym>/catalogue <open-exercise-figures>/exercises.json
//
// Writes public/catalogue/index.json (every exercise, the fields search and filters need) and
// public/catalogue/details/<NN>.json (instructions, grouped by the first two digits of the id so
// opening one exercise fetches ~100 entries, not 5,600).
//
// Text: openGym catalog (AGPL-3.0; ids 0001-1324 originally ExerciseDB text, MIT). See NOTICE.md.
// Animations: Open Exercise Figures (CC0). Its files are named by the same ExerciseDB ids, so an
// exercise has an animation exactly when its id is in that list.

import fs from 'node:fs'
import path from 'node:path'

const [catDir, figuresJson] = process.argv.slice(2)
if (!catDir || !figuresJson) {
  console.error('usage: build-catalogue.mjs <catalog dir> <figures exercises.json>')
  process.exit(1)
}

// Every spelling of a muscle in the catalog's target / secondaryMuscles fields, mapped onto
// the 18 regions the body map draws. null = not drawable (hands, ankles). From openGym's muscles.js.
const ALIAS = {
  abs: 'abs', pectorals: 'chest', biceps: 'biceps', glutes: 'gluteal', delts: 'deltoids',
  triceps: 'triceps', 'upper back': 'upper-back', lats: 'upper-back', calves: 'calves',
  quads: 'quadriceps', forearms: 'forearm', hamstrings: 'hamstring', spine: 'lower-back',
  traps: 'trapezius', adductors: 'adductors', 'serratus anterior': 'serratus',
  abductors: 'gluteal', 'levator scapulae': 'trapezius', 'cardiovascular system': null,
  shoulders: 'deltoids', deltoids: 'deltoids', 'rear deltoids': 'deltoids',
  'rotator cuff': 'deltoids', quadriceps: 'quadriceps', core: 'abs', abdominals: 'abs',
  'lower abs': 'abs', chest: 'chest', 'upper chest': 'chest', 'hip flexors': 'hip-flexors',
  obliques: 'obliques', 'lower back': 'lower-back', rhomboids: 'upper-back',
  trapezius: 'trapezius', back: 'upper-back', 'latissimus dorsi': 'upper-back',
  brachialis: 'biceps', soleus: 'calves', shins: 'tibialis', wrists: 'forearm',
  'wrist flexors': 'forearm', 'wrist extensors': 'forearm', 'grip muscles': 'forearm',
  groin: 'adductors', 'inner thighs': 'adductors',
}

const figures = new Set(JSON.parse(fs.readFileSync(figuresJson, 'utf8')).map(e => e.id))
const dir = path.join(catDir, 'exercises')
const index = []
const details = {}
const unknown = new Set()

for (const file of fs.readdirSync(dir).sort()) {
  const e = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  if (e.variantOf) continue // a female-figure drawing of another exercise, not an exercise of its own
  const muscle = m => {
    if (!(m in ALIAS)) unknown.add(m)
    return ALIAS[m] ?? null
  }
  let p = e.muscleMap?.primaries
  let s = e.muscleMap?.secondaries
  if (!p) {
    p = [muscle(e.target)].filter(Boolean)
    s = (e.secondaryMuscles || []).map(muscle).filter(m => m && !p.includes(m))
  }
  index.push({
    id: e.id,
    n: e.name,
    bp: e.bodyPart,
    eq: e.equipment,
    tg: e.target,
    sm: e.secondaryMuscles || [],
    cat: e.category,
    d: e.description || '',
    p,
    s: [...new Set(s)],
    src: e.textSource === 'exercisedb' ? 'x' : 'o',
    ...(figures.has(e.id) ? { a: 1 } : {}),
  })
  const chunk = e.id.slice(0, 2)
  ;(details[chunk] ||= {})[e.id] = e.instructions || []
}

// ExerciseDB entries first: they are the familiar core and the ones with animations.
index.sort((a, b) => (a.src === b.src ? 0 : a.src === 'x' ? -1 : 1) || a.id.localeCompare(b.id))

const out = path.resolve(import.meta.dirname, '../public/catalogue')
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(path.join(out, 'details'), { recursive: true })
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index))
for (const [chunk, body] of Object.entries(details)) {
  fs.writeFileSync(path.join(out, 'details', chunk + '.json'), JSON.stringify(body))
}
const animated = index.filter(e => e.a).length
console.log(`${index.length} exercises, ${animated} with animations, ${Object.keys(details).length} detail chunks`)
if (unknown.size) console.log('muscle names with no body-map region:', [...unknown].join(', '))
