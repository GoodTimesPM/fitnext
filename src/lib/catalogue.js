// The exercise catalog: loading, filter vocabularies and search.
//
// The search is ported from openGym's frontend/src/lib/exercises.js (AGPL-3.0, see NOTICE.md),
// trimmed to English. Multi-token, accent-insensitive, typo-tolerant on name words, gym
// shorthand ("db", "rdl", "ohp"), and ranked: whole name word > word start > inside the name >
// name run together > typo > other field, plus a small prior for common lifts and equipment.

let CATALOGUE = []
let INDEX = {}
let loading = null

export const loadCatalogue = () => (loading ||= fetch('/catalogue/index.json')
  .then(r => r.json())
  .then(list => {
    CATALOGUE = list
    INDEX = Object.fromEntries(list.map(e => [e.id, e]))
    return list
  }))

export const catalogue = () => CATALOGUE
export const exById = id => INDEX[id]

const detailChunks = {}
export const loadInstructions = id => (detailChunks[id.slice(0, 2)] ||= fetch(`/catalogue/details/${id.slice(0, 2)}.json`).then(r => r.json()))
  .then(chunk => chunk[id] || [])

// Open Exercise Figures (CC0), pinned to a commit so the files never change under us.
const FIGURES = 'https://cdn.jsdelivr.net/gh/AbanoubAmir/open-exercise-figures@a0574d54baaf23f5784dfdebd5c65f6a87fd5194/animations/'
export const animSrc = e => (e?.a ? FIGURES + e.id + '.webp' : null)

export const BODY_PARTS = ['chest', 'back', 'shoulders', 'upper arms', 'lower arms', 'waist', 'upper legs', 'lower legs', 'neck', 'full body', 'cardio']
export const CATEGORIES = ['strength', 'calisthenics', 'olympic', 'plyometrics', 'isometric', 'cardio', 'stretching', 'mobility', 'yoga', 'pilates', 'combat', 'rehab']

// Values present in a list, most common first, so every chip on screen has results behind it.
export function countsOf(list, key) {
  const c = {}
  for (const e of list) c[e[key]] = (c[e[key]] || 0) + 1
  return Object.entries(c).sort((a, b) => b[1] - a[1])
}

export const normalizeStr = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const corpusCache = new WeakMap()
const VOCAB = new Set()

function corpusOf(e) {
  const hit = corpusCache.get(e)
  if (hit) return hit
  const name = normalizeStr(e.n)
  const s = normalizeStr([name, e.tg, e.eq, e.bp, ...(e.sm || []), e.d].join(' '))
  const entry = { s, name, ...joinedOf(name), nameWords: name.split(/[\s\-‐-―()/,]+/).filter(Boolean) }
  for (const w of entry.nameWords) VOCAB.add(w)
  corpusCache.set(e, entry)
  return entry
}

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1)
      cur.push(v)
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]
}

// Typos allowed in a query word: none below four letters, one up to six, two from seven.
const typosFor = word => (word.length < 4 ? 0 : word.length < 7 ? 1 : 2)

function nearWordUncached(a, b) {
  const max = typosFor(a)
  if (!max) return false
  if (editDistance(a, b, max) <= max) return true
  return a.length >= 5 && b.length > a.length && editDistance(a, b.slice(0, a.length), max) <= max
}

let nearCache = new Map()
const resetNearCache = () => { if (nearCache.size) nearCache = new Map() }
const nearWord = (a, b) => {
  const key = a + '\u0000' + b
  let v = nearCache.get(key)
  if (v === undefined) { v = nearWordUncached(a, b); nearCache.set(key, v) }
  return v
}

const SYNONYMS = {
  db: ['dumbbell'], dbs: ['dumbbell'], bb: ['barbell'], kb: ['kettlebell'], kbs: ['kettlebell'],
  ez: ['ez barbell'], sm: ['smith'], bw: ['body weight'], bodyweight: ['body weight'],
  ohp: ['overhead press', 'shoulder press', 'military press'], rdl: ['romanian deadlift'],
  sldl: ['stiff leg deadlift'], dl: ['deadlift'], bp: ['bench press'], skullcrusher: ['lying triceps extension', 'skull crusher'],
  skullcrushers: ['lying triceps extension', 'skull crusher'], pulldown: ['pull down', 'pulldown'],
  pullup: ['pull up', 'pull-up'], chinup: ['chin up', 'chin-up'], pushup: ['push up', 'push-up'],
  pressup: ['push up', 'push-up'], situp: ['sit up', 'sit-up'], flye: ['fly'], flyes: ['fly'], flies: ['fly'],
  machine: ['lever', 'machine', 'sled'], lever: ['lever', 'machine'], abs: ['crunch', 'abs'],
  hammy: ['hamstring'], hammies: ['hamstring'], quad: ['quads', 'quadriceps'], tricep: ['triceps'], bicep: ['biceps'],
  delt: ['delts', 'shoulder'], lat: ['lats', 'latissimus', 'pulldown'], trap: ['traps', 'shrug'],
  glute: ['glutes', 'gluteus'], calf: ['calf', 'calves'], trx: ['suspension'],
  ring: ['ring', 'suspension'], rings: ['ring', 'suspension'], kettle: ['kettlebell'], dumbel: ['dumbbell'],
}

const formsCache = new Map()
function formsOf(tok) {
  let forms = formsCache.get(tok)
  if (forms) return forms
  const out = [tok, ...(SYNONYMS[tok] || [])]
  if (tok.length >= 4 && tok.endsWith('es') && !tok.endsWith('ses')) out.push(tok.slice(0, -2), tok.slice(0, -1))
  else if (tok.length >= 4 && tok.endsWith('ses')) out.push(tok.slice(0, -2))
  else if (tok.length >= 3 && tok.endsWith('s') && !tok.endsWith('ss') && tok !== 'abs') out.push(tok.slice(0, -1))
  forms = [...new Set(out)]
  if (formsCache.size > 500) formsCache.clear()
  formsCache.set(tok, forms)
  return forms
}

const queryTokens = query => normalizeStr(query).split(/\s+/).filter(Boolean)
const SEPARATOR = /[\s\-‐-―]/
const WORD_CHAR = /[\p{L}\p{N}]/u
const joinWords = str => str.replace(/[\s\-‐-―]+/g, '')

function joinedOf(name) {
  let joined = ''
  const starts = new Set()
  for (let i = 0; i < name.length; i++) {
    if (SEPARATOR.test(name[i])) continue
    if (i === 0 || !WORD_CHAR.test(name[i - 1])) starts.add(joined.length)
    joined += name[i]
  }
  return { joined, starts }
}

function joinedHit(entry, tok) {
  const needle = joinWords(tok)
  for (let at = entry.joined.indexOf(needle); at !== -1; at = entry.joined.indexOf(needle, at + 1)) {
    if (entry.starts.has(at)) return true
  }
  return false
}

const literalHit = (entry, tok) => entry.s.includes(tok) || (tok.length >= 4 && joinedHit(entry, tok))
const hits = (entry, tok) => formsOf(tok).some(form => literalHit(entry, form))

const matchTokens = (e, tokens, fuzzy) => {
  const entry = corpusOf(e)
  return tokens.every(tok => hits(entry, tok) || (fuzzy.has(tok) && formsOf(tok).some(f => entry.nameWords.some(word => nearWord(f, word)))))
}

// Exact hits first: only a token with no literal hit anywhere in the list gets typo tolerance,
// so "squat" never drags in "squad".
export function searchExercises(list, query) {
  const tokens = queryTokens(query)
  if (!tokens.length) return list
  resetNearCache()
  const fuzzy = new Set(tokens.filter(tok => !list.some(e => hits(corpusOf(e), tok))))
  return rankByRelevance(list.filter(e => matchTokens(e, tokens, fuzzy)), tokens)
}

function queryContext(tokens) {
  const ctx = new Map()
  for (const tok of tokens) {
    for (const form of formsOf(tok)) {
      if (ctx.has(form) || form.includes(' ')) continue
      const prefix = new Set(), near = new Set()
      for (const w of VOCAB) {
        if (w.startsWith(form)) prefix.add(w)
        if (nearWordUncached(form, w)) near.add(w)
      }
      ctx.set(form, { prefix, near })
    }
  }
  return ctx
}

function tokenScore(entry, tok, ctx) {
  let best = 0
  for (const form of formsOf(tok)) {
    const c = ctx.get(form)
    const exact = form === tok || (tok.length <= 4 && SYNONYMS[tok]?.includes(form)) ? 0 : 5
    if (form.includes(' ')) {
      if (entry.name.includes(form)) best = Math.max(best, 100 - exact)
      else if (entry.s.includes(form)) best = Math.max(best, 20 - exact)
      continue
    }
    if (entry.nameWords.includes(form)) best = Math.max(best, 100 - exact)
    else if (entry.nameWords.some(w => c.prefix.has(w))) best = Math.max(best, 80 - exact)
    else if (entry.name.includes(form)) best = Math.max(best, 60 - exact)
    else if (form.length >= 4 && joinedHit(entry, form)) best = Math.max(best, 55 - exact)
    else if (entry.nameWords.some(w => c.near.has(w))) best = Math.max(best, 40 - exact)
    else if (entry.s.includes(form)) best = Math.max(best, 20 - exact)
  }
  return best
}

// Orders ties, never beats a better match: the ExerciseDB core, common equipment, a lift before a stretch.
const EQ_PRIOR = { barbell: 4, dumbbell: 4, cable: 3, 'leverage machine': 3, 'body weight': 3, 'smith machine': 2, kettlebell: 2, 'ez barbell': 2, 'sled machine': 2 }
const CAT_PRIOR = { strength: 3, calisthenics: 3, olympic: 2, plyometrics: 1, isometric: 1, stretching: -3, mobility: -3, rehab: -4, yoga: -2, pilates: -2 }
const priorOf = e => (e.src === 'x' ? 3 : 0) + (EQ_PRIOR[e.eq] || 0) + (CAT_PRIOR[e.cat] || 0) + (e.id === '0739' ? 6 : 0)

function wholeNameScore(plain, typedForms) {
  if (typedForms.includes(plain)) return 50
  return typedForms.some(q => { const max = typosFor(q); return max && editDistance(q, plain, max) <= max }) ? 40 : 0
}

function rankByRelevance(found, tokens) {
  const ctx = queryContext(tokens)
  const typedForms = [...new Set([tokens, tokens.map(tok => formsOf(tok).find(f => f !== tok && !f.includes(' ')) || tok)]
    .map(list => list.join(' ').replace(/[-‐-―]/g, ' ')))]
  const scored = found.map((e, i) => {
    const entry = corpusOf(e)
    const plain = entry.name.split(' (')[0].replace(/[-‐-―]/g, ' ')
    const extra = Math.max(0, entry.nameWords.length - tokens.length) * 3
    const score = tokens.reduce((sum, tok) => sum + tokenScore(entry, tok, ctx), 0) + priorOf(e) + wholeNameScore(plain, typedForms) - extra
    return { e, i, score, len: entry.nameWords.length }
  })
  scored.sort((a, b) => b.score - a.score || a.len - b.len || a.i - b.i)
  return scored.map(x => x.e)
}
