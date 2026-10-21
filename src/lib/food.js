// Food sources. Open Food Facts is called straight from the browser (no key, CORS open);
// everything else goes through server/proxy.mjs, which holds the keys and returns the same shape:
//   { key, src, name, brand, serving: { label, g }, perServing, n: { kcal, p, c, f, ... } }
// n is per 100 g, or per serving when perServing is true. A diary entry's qty is grams, or servings.

export const SOURCES = {
  off: { name: 'Open Food Facts', note: '4M+ packaged foods, worldwide' },
  usda: { name: 'USDA FoodData Central', note: 'Generic foods with full micronutrients, US branded' },
  fatsecret: { name: 'FatSecret', note: 'US foods and restaurants, free tier' },
  edamam: { name: 'Edamam', note: 'Food database, paid after a 30-day trial' },
}

export const MICROS = [
  ['fiber', 'Fiber', 'g', 30], ['sugar', 'Sugar', 'g', 50], ['satfat', 'Saturated fat', 'g', 20],
  ['chol', 'Cholesterol', 'mg', 300], ['sodium', 'Sodium', 'mg', 2300], ['potassium', 'Potassium', 'mg', 3400],
  ['calcium', 'Calcium', 'mg', 1300], ['iron', 'Iron', 'mg', 18], ['magnesium', 'Magnesium', 'mg', 420],
  ['vitA', 'Vitamin A', 'µg', 900], ['vitC', 'Vitamin C', 'mg', 90], ['vitD', 'Vitamin D', 'µg', 20], ['b12', 'Vitamin B12', 'µg', 2.4],
]

let status = null
export const apiStatus = () => (status ||= fetch(API + '/api/status').then(r => (r.ok ? r.json() : {})).catch(() => ({})))

// The phone app and the hosted site reach the API at VITE_API_BASE; the desktop app and dev server serve it at /api.
const API = import.meta.env.VITE_API_BASE || ''

const get = async url => {
  const r = await fetch(url.startsWith('/') ? API + url : url)
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
  return r.json()
}
const post = async (url, body) => {
  const r = await fetch(API + url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText)
  return r.json()
}

// ---------- Open Food Facts ----------
const OFF_FIELDS = 'code,product_name,brands,nutriments,serving_size,serving_quantity'
const OFF_N = { 'energy-kcal_100g': 'kcal', proteins_100g: 'p', carbohydrates_100g: 'c', fat_100g: 'f', fiber_100g: 'fiber', sugars_100g: 'sugar',
  'saturated-fat_100g': 'satfat' }
// OFF stores minerals and vitamins in grams; we keep mg / µg.
const OFF_MG = { sodium_100g: 'sodium', potassium_100g: 'potassium', calcium_100g: 'calcium', iron_100g: 'iron', cholesterol_100g: 'chol', 'vitamin-c_100g': 'vitC', magnesium_100g: 'magnesium' }
const OFF_UG = { 'vitamin-d_100g': 'vitD', 'vitamin-a_100g': 'vitA', 'vitamin-b12_100g': 'b12' }
const r1 = v => Math.round(v * 10) / 10

function offFood(p) {
  const m = p.nutriments || {}
  const n = {}
  for (const [k, to] of Object.entries(OFF_N)) if (m[k] != null) n[to] = r1(+m[k])
  for (const [k, to] of Object.entries(OFF_MG)) if (m[k] != null) n[to] = r1(m[k] * 1000)
  for (const [k, to] of Object.entries(OFF_UG)) if (m[k] != null) n[to] = r1(m[k] * 1e6)
  if (n.kcal == null && m['energy_100g'] != null) n.kcal = Math.round(m['energy_100g'] / 4.184)
  const g = +p.serving_quantity || null
  const label = (p.serving_size || '').replace(/\(.*?\)/g, '').trim()
  // A serving size that is just a weight ("30 g") is not a household unit.
  const units = g && label && !/^[\d.,]+\s*(g|ml)$/i.test(label) ? [{ label, g }] : []
  return { key: 'off:' + p.code, src: 'off', name: p.product_name || 'Unnamed product', brand: [].concat(p.brands || '').join(',').split(',')[0].trim(),
    serving: g ? { label: p.serving_size || `${g} g`, g } : { label: '100 g', g: 100 }, perServing: false, n, code: p.code, units }
}

export async function offSearch(q) {
  // The proxy's name-ranked search first; the browser-reachable search.pl when no proxy answers.
  const j = await get(`/api/off/search?q=${encodeURIComponent(q)}`)
    .catch(() => get(`https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&page_size=24&fields=${OFF_FIELDS}&search_terms=${encodeURIComponent(q)}`))
  return j.products.filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'] != null).map(offFood)
}
export async function offBarcode(code) {
  const j = await get(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`)
  return j.status === 1 ? offFood(j.product) : null
}

// ---------- the proxied sources ----------
export const search = (src, q) => (src === 'off' ? offSearch(q) : get(`/api/${src}/search?q=${encodeURIComponent(q)}`))

// Every available source at once, merged into one list with the closest match first.
// onUpdate gets the merged list each time another source answers, so fast sources show first.
export async function searchAll(q, onUpdate) {
  const s = await apiStatus()
  const srcs = ['off', ...['usda', 'fatsecret', 'edamam'].filter(x => s[x])]
  let merged = []
  const errors = []
  await Promise.all(srcs.map(src => search(src, q).then(list => {
    merged = rankFoods(q, [...merged, ...list])
    onUpdate?.(merged)
  }).catch(e => errors.push(e))))
  if (!merged.length && errors.length === srcs.length) throw errors[0]
  return merged
}

const words = s => (s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
const sameWord = (a, b) => a === b || a + 's' === b || a === b + 's' || a + 'es' === b || (b.length > 3 && a.startsWith(b))

// How close a food is to the query: every query word in the name, few extra words, name starting
// with the query, generic before branded, and a household unit to log it by.
export function matchScore(q, f) {
  const qw = words(q), nw = words(f.name)
  if (!qw.length || f.n?.kcal == null) return -1e9
  const hit = qw.filter(w => nw.some(n => sameWord(n, w))).length
  let s = (hit / qw.length) * 100 - Math.max(0, nw.length - hit) * 5
  if (nw[0] && sameWord(nw[0], qw[0])) s += 12
  if (nw.join(' ') === qw.join(' ')) s += 40
  if (!f.brand) s += 8
  if (f.units?.length) s += 4
  if (/raw|whole|plain/i.test(f.name)) s += 2
  return s
}

export function rankFoods(q, list) {
  const seen = new Map()
  for (const f of list) {
    const k = words(f.name).join(' ') + '|' + (f.brand || '').toLowerCase()
    const prev = seen.get(k)
    if (!prev || Object.keys(f.n).length + (f.units?.length || 0) > Object.keys(prev.n).length + (prev.units?.length || 0)) seen.set(k, f)
  }
  return [...seen.values()].map(f => [matchScore(q, f), f]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).map(([, f]) => f)
}

// Barcode: Open Food Facts first (largest barcode set, free), then whichever keyed sources exist.
export async function barcodeLookup(code) {
  const s = await apiStatus()
  const order = [() => offBarcode(code), s.fatsecret && (() => get(`/api/fatsecret/barcode?code=${code}`)),
    s.usda && (() => get(`/api/usda/barcode?code=${code}`)), s.edamam && (() => get(`/api/edamam/barcode?code=${code}`))].filter(Boolean)
  for (const tryOne of order) {
    try { const f = await tryOne(); if (f) return f } catch { /* next source */ }
  }
  return null
}

export const mealdb = (path, params = {}) => get(`/api/mealdb/${path}?` + new URLSearchParams(params))
export const importRecipe = url => post('/api/recipe-import', { url })
export const recipeNutrition = recipe => post('/api/recipe-nutrition', { title: recipe.title, servings: recipe.servings, ingredients: recipe.ingredients })
export const recipeSearch = params => get('/api/recipes?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)))
export const photoEstimate = (image, mime) => post('/api/photo', { image, mime })
export const parseSpoken = text => post('/api/parse', { text })
export const transcribe = (audio, mime) => post('/api/transcribe', { audio, mime })

// ---------- arithmetic ----------
export const factor = (food, qty) => (food.perServing ? qty : qty / 100)
export const defaultQty = food => (food.perServing ? 1 : food.serving?.g || 100)
export function totals(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 }
  for (const { food, qty } of entries) {
    const k = factor(food, qty)
    for (const [key, v] of Object.entries(food.n || {})) t[key] = (t[key] || 0) + v * k
  }
  return t
}

// A food built from a model's estimate (photo or voice), so it can go in the diary like any other.
export const estimatedFood = it => ({
  key: 'ai:' + it.name.toLowerCase(), src: 'ai', name: it.name, brand: 'Estimate',
  serving: { label: `${Math.round(it.grams)} g`, g: it.grams }, perServing: false,
  n: { kcal: r1((it.kcal * 100) / it.grams), p: r1((it.p * 100) / it.grams), c: r1((it.c * 100) / it.grams), f: r1((it.f * 100) / it.grams) },
})
