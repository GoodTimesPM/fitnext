// API proxy: holds the keys (from .env) and turns every food source into one shape.
//
//   npm run proxy        (port 8797; vite's dev server forwards /api here)
//   the desktop app imports api() and answers /api itself
//
// Food shape, shared with src/lib/food.js:
//   { key, src, name, brand, serving: { label, g }, perServing, n: { kcal, p, c, f, fiber, ... } }
// n is per 100 g, or per one serving when perServing is true (when the source gives no gram weight).
// Open Food Facts needs no key and is called from the browser directly.

import http from 'node:http'
import { pathToFileURL } from 'node:url'

const env = process.env
const PORT = +(env.PORT || 8797)
const has = {
  usda: !!env.USDA_API_KEY,
  fatsecret: !!(env.FATSECRET_CLIENT_ID && env.FATSECRET_CLIENT_SECRET),
  edamam: !!(env.EDAMAM_APP_ID && env.EDAMAM_APP_KEY),
  spoonacular: !!env.SPOONACULAR_API_KEY,
  gemini: !!env.GEMINI_API_KEY,
}

const getJSON = async (url, init) => {
  const r = await fetch(url, init)
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}
const round = v => (v == null || Number.isNaN(v) ? undefined : Math.round(v * 10) / 10)

// Same request within an hour: answer from memory. Saves the free tiers' hourly quotas.
const cache = new Map()
function cached(key, fn) {
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.v
  const v = fn().catch(e => { cache.delete(key); throw e })
  cache.set(key, { v, until: Date.now() + 36e5 })
  if (cache.size > 400) cache.delete(cache.keys().next().value)
  return v
}

// ---------- USDA FoodData Central ----------
// Nutrient numbers -> our keys. Energy: 208 (kcal), or the Atwater values Foundation foods use.
const USDA = { 208: 'kcal', 957: 'kcal', 958: 'kcal', 203: 'p', 205: 'c', 204: 'f', 291: 'fiber', 269: 'sugar', 606: 'satfat',
  601: 'chol', 307: 'sodium', 306: 'potassium', 301: 'calcium', 303: 'iron', 401: 'vitC', 328: 'vitD', 320: 'vitA', 418: 'b12', 304: 'magnesium' }

function usdaFood(f) {
  const n = {}
  for (const x of f.foodNutrients || []) {
    const k = USDA[x.nutrientNumber || x.nutrient?.number]
    const v = x.value ?? x.amount
    if (k && v != null && n[k] == null) n[k] = round(v)
  }
  const g = f.servingSizeUnit && /^g|grm|ml$/i.test(f.servingSizeUnit) ? f.servingSize : null
  // Household measures ("1 large", "1 cup, chopped") come with survey (FNDDS) foods; branded foods have one.
  const units = (f.foodMeasures || []).filter(m => m.gramWeight > 0 && m.disseminationText && !/not specified/i.test(m.disseminationText))
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map(m => ({ label: m.disseminationText, g: round(m.gramWeight) }))
  if (g && f.householdServingFullText) units.push({ label: f.householdServingFullText, g: round(g) })
  return {
    key: 'usda:' + f.fdcId, src: 'usda', name: titleCase(f.description), brand: f.brandOwner || f.brandName || '',
    serving: g ? { label: f.householdServingFullText || `${round(g)} g`, g: round(g) } : { label: '100 g', g: 100 },
    perServing: false, n, units,
  }
}
// Generic foods (Foundation, SR Legacy, survey) before branded ones; USDA's relevance order holds within each group.
const usdaSearch = q => cached('usda:' + q.toLowerCase(), async () => (await getJSON(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${env.USDA_API_KEY}&pageSize=30&dataType=${encodeURIComponent('Foundation,SR Legacy,Survey (FNDDS),Branded')}&query=${encodeURIComponent(q)}`))
  .foods.sort((a, b) => (a.dataType === 'Branded') - (b.dataType === 'Branded')).map(usdaFood))
const usdaBarcode = async code => {
  const hit = (await getJSON(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${env.USDA_API_KEY}&pageSize=5&dataType=Branded&query=${encodeURIComponent(code)}`))
    .foods.find(f => f.gtinUpc && f.gtinUpc.replace(/^0+/, '') === code.replace(/^0+/, ''))
  return hit ? usdaFood(hit) : null
}

// ---------- FatSecret Platform (OAuth2 client credentials) ----------
let fsToken = null
async function fatsecret(path, params) {
  if (!fsToken || fsToken.until < Date.now()) {
    const t = await getJSON('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic ' + Buffer.from(env.FATSECRET_CLIENT_ID + ':' + env.FATSECRET_CLIENT_SECRET).toString('base64') },
      body: 'grant_type=client_credentials&scope=' + encodeURIComponent(env.FATSECRET_SCOPE || 'basic'),
    })
    fsToken = { value: t.access_token, until: Date.now() + (t.expires_in - 60) * 1000 }
  }
  const qs = new URLSearchParams({ ...params, format: 'json' })
  return getJSON(`https://platform.fatsecret.com/rest/${path}?${qs}`, { headers: { authorization: 'Bearer ' + fsToken.value } })
}
// Search results carry nutrition only as text: "Per 100g - Calories: 52kcal | Fat: 0.17g | Carbs: 13.81g | Protein: 0.26g"
function fatsecretHit(f) {
  const d = f.food_description || ''
  const per = (d.match(/^Per (.+?) -/) || [])[1] || '1 serving'
  const num = re => round(parseFloat((d.match(re) || [])[1]))
  const n = { kcal: num(/Calories:\s*([\d.]+)/), f: num(/Fat:\s*([\d.]+)/), c: num(/Carbs:\s*([\d.]+)/), p: num(/Protein:\s*([\d.]+)/) }
  const grams = per.match(/^([\d.]+)\s*g$/)
  const g = grams ? +grams[1] : null
  if (g && g !== 100) for (const k in n) n[k] = round(n[k] * 100 / g)
  return { key: 'fatsecret:' + f.food_id, src: 'fatsecret', name: f.food_name, brand: f.brand_name || '',
    serving: { label: per, g }, perServing: !g, n }
}
function fatsecretFull(food) {
  const servings = [].concat(food.servings?.serving || [])
  const s = servings.find(x => x.metric_serving_unit === 'g' && +x.metric_serving_amount) || servings[0]
  const g = s && s.metric_serving_unit === 'g' ? +s.metric_serving_amount : null
  const scale = v => round(g ? (+v * 100) / g : +v)
  const n = {}
  const map = { calories: 'kcal', protein: 'p', carbohydrate: 'c', fat: 'f', fiber: 'fiber', sugar: 'sugar', saturated_fat: 'satfat',
    cholesterol: 'chol', sodium: 'sodium', potassium: 'potassium', calcium: 'calcium', iron: 'iron', vitamin_c: 'vitC', vitamin_d: 'vitD', vitamin_a: 'vitA' }
  for (const [from, to] of Object.entries(map)) if (s?.[from] != null) n[to] = scale(s[from])
  return { key: 'fatsecret:' + food.food_id, src: 'fatsecret', name: food.food_name, brand: food.brand_name || '',
    serving: { label: s?.serving_description || '1 serving', g }, perServing: !g, n }
}
const fatsecretSearch = q => cached('fs:' + q.toLowerCase(), () => fatsecretSearchLive(q))
const fatsecretSearchLive = async q => [].concat((await fatsecret('foods/search/v1', { search_expression: q, max_results: 25 })).foods?.food || []).map(fatsecretHit)
async function fatsecretBarcode(code) {
  const id = (await fatsecret('food/barcode/find-by-id/v1', { barcode: code.padStart(13, '0') })).food_id?.value
  if (!id || id === '0') return null
  return fatsecretFull((await fatsecret('food/v4', { food_id: id })).food)
}

// ---------- Edamam Food Database ----------
const EDAMAM = { ENERC_KCAL: 'kcal', PROCNT: 'p', CHOCDF: 'c', FAT: 'f', FIBTG: 'fiber' }
async function edamam(params) {
  const qs = new URLSearchParams({ app_id: env.EDAMAM_APP_ID, app_key: env.EDAMAM_APP_KEY, 'nutrition-type': 'logging', ...params })
  const j = await getJSON('https://api.edamam.com/api/food-database/v2/parser?' + qs)
  return [...(j.parsed || []), ...(j.hints || [])].map(h => h.food).filter((f, i, a) => a.findIndex(x => x.foodId === f.foodId) === i).map(f => {
    const n = {}
    for (const [from, to] of Object.entries(EDAMAM)) if (f.nutrients?.[from] != null) n[to] = round(f.nutrients[from])
    return { key: 'edamam:' + f.foodId, src: 'edamam', name: titleCase(f.label), brand: f.brand || '', serving: { label: '100 g', g: 100 }, perServing: false, n }
  })
}

// ---------- Spoonacular recipes ----------
async function recipes({ q = '', maxKcal, minProtein }) {
  const qs = new URLSearchParams({ apiKey: env.SPOONACULAR_API_KEY, query: q, number: '12', addRecipeInformation: 'true', addRecipeNutrition: 'true', sort: q ? 'meta-score' : 'popularity' })
  if (maxKcal) qs.set('maxCalories', maxKcal)
  if (minProtein) qs.set('minProtein', minProtein)
  const j = await getJSON('https://api.spoonacular.com/recipes/complexSearch?' + qs)
  return j.results.map(r => {
    const nut = name => round(r.nutrition?.nutrients?.find(x => x.name === name)?.amount)
    return { id: r.id, title: r.title, image: r.image, mins: r.readyInMinutes, servings: r.servings, url: r.sourceUrl,
      kcal: nut('Calories'), p: nut('Protein'), c: nut('Carbohydrates'), f: nut('Fat'),
      ingredients: (r.nutrition?.ingredients || r.extendedIngredients || []).map(i => i.original || `${round(i.amount)} ${i.unit} ${i.name}`) }
  })
}

// ---------- TheMealDB: free recipe library with photos (no nutrition) ----------
// "1" is TheMealDB's public test key; a released app needs a supporter key in MEALDB_KEY.
const MEALDB = `https://www.themealdb.com/api/json/v1/${env.MEALDB_KEY || '1'}/`
const mealdbGet = path => cached('mealdb:' + path, () => getJSON(MEALDB + path))
function meal(m) {
  const ingredients = []
  for (let i = 1; i <= 20; i++) {
    const name = (m['strIngredient' + i] || '').trim()
    if (name) ingredients.push(`${(m['strMeasure' + i] || '').trim()} ${name}`.trim())
  }
  return {
    title: m.strMeal, image: m.strMealThumb, servings: 4, mins: null, ingredients,
    steps: (m.strInstructions || '').split(/\r?\n+/).map(x => x.replace(/^\s*(step\s*)?\d+[.):]?\s*/i, '').trim()).filter(x => x.length > 2),
    tags: [m.strCategory, m.strArea, ...(m.strTags || '').split(',')].filter(Boolean).map(t => t.trim()),
    source: 'mealdb:' + m.idMeal, url: m.strSource || `https://www.themealdb.com/meal/${m.idMeal}`,
  }
}
async function mealdbList(q) {
  if (q.get('c')) {
    // Category lists are thin (name and photo); look each one up for ingredients and steps.
    const thin = (await mealdbGet('filter.php?c=' + encodeURIComponent(q.get('c')))).meals || []
    const out = []
    for (let i = 0; i < thin.length; i += 8) {
      const batch = await Promise.all(thin.slice(i, i + 8).map(m => mealdbGet('lookup.php?i=' + m.idMeal).then(j => j.meals?.[0]).catch(() => null)))
      out.push(...batch.filter(Boolean))
    }
    return out.map(meal)
  }
  if (q.get('f')) return ((await mealdbGet('search.php?f=' + encodeURIComponent(q.get('f')))).meals || []).map(meal)
  return ((await mealdbGet('search.php?s=' + encodeURIComponent(q.get('q') || ''))).meals || []).map(meal)
}
const mealdbCategories = async () => ((await mealdbGet('categories.php')).categories || []).map(c => ({ name: c.strCategory, image: c.strCategoryThumb }))

// ---------- recipe import from a recipe page (schema.org Recipe JSON-LD, which most recipe sites publish) ----------
const minutes = iso => { const m = /P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || ''); return m && (m[1] || m[2]) ? (+m[1] || 0) * 60 + (+m[2] || 0) : null }
const num = v => { const m = /[\d.]+/.exec(String(v ?? '')); return m ? round(+m[0]) : undefined }
const text = v => (typeof v === 'string' ? v : v?.text || v?.name || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim()
function steps(ins) {
  if (!ins) return []
  if (typeof ins === 'string') return ins.split(/\r?\n+/).map(text).filter(Boolean)
  return [].concat(ins).flatMap(x => (x?.itemListElement ? steps(x.itemListElement) : [text(x)])).filter(Boolean)
}
function findRecipe(node) {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) { for (const x of node) { const r = findRecipe(x); if (r) return r } return null }
  if ([].concat(node['@type']).some(t => /recipe/i.test(t))) return node
  return findRecipe(node['@graph']) || findRecipe(node.mainEntity)
}
async function recipeImport({ url }) {
  const u = new URL(url)
  if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|0\.)/.test(u.hostname)) throw new Error('Only public web pages can be imported')
  // The desktop app sets pageFetch to Chromium's network stack, which more recipe sites let through.
  const r = await (globalThis.pageFetch || fetch)(u.href, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36', accept: 'text/html' }, redirect: 'follow' })
  if (!r.ok) throw new Error(`${u.host} answered ${r.status}`)
  const html = (await r.text()).slice(0, 3e6)
  let rec = null
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { rec = findRecipe(JSON.parse(m[1].trim())) } catch { /* next block */ }
    if (rec) break
  }
  if (!rec) throw new Error('No recipe data on that page. Most recipe sites have it; blogs without a recipe card may not.')
  const img = [].concat(rec.image || [])[0]
  const nut = rec.nutrition || {}
  return {
    title: text(rec.name), image: typeof img === 'string' ? img : img?.url || '', servings: num([].concat(rec.recipeYield || [])[0]) || 1,
    mins: minutes(rec.totalTime) || (minutes(rec.prepTime) || 0) + (minutes(rec.cookTime) || 0) || null,
    ingredients: [].concat(rec.recipeIngredient || []).map(text), steps: steps(rec.recipeInstructions),
    kcal: num(nut.calories), p: num(nut.proteinContent), c: num(nut.carbohydrateContent), f: num(nut.fatContent),
    tags: [].concat(rec.recipeCategory || [], rec.recipeCuisine || []).map(text).filter(Boolean),
    source: 'url:' + u.href, url: u.href,
  }
}

// ---------- Gemini: photo logging and voice-text parsing ----------
async function gemini(parts, schema) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash'
  const j = await getJSON(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 } }),
  })
  return JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
}
const ITEMS = (props, req) => ({ type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: props, required: req } } }, required: ['items'] })

// Weight first, then nutrition: estimating grams before calories lowers calorie error (2026 Nutrition5k VLM benchmark).
const PHOTO_PROMPT = `You are a dietitian logging a meal from one photo. List each distinct food or drink you can see.
For each: a short generic name a food database would use, your estimate of its weight in grams (estimate the weight FIRST, using plate, cutlery and hand size as scale), then calories, protein, carbs and fat for that weight.
Include cooking oil, sauces and dressings you can see as separate items. confidence is 0-1.`
const photo = ({ image, mime }) => gemini([{ text: PHOTO_PROMPT }, { inline_data: { mime_type: mime || 'image/jpeg', data: image } }],
  ITEMS({ name: { type: 'STRING' }, grams: { type: 'NUMBER' }, kcal: { type: 'NUMBER' }, p: { type: 'NUMBER' }, c: { type: 'NUMBER' }, f: { type: 'NUMBER' }, confidence: { type: 'NUMBER' } },
    ['name', 'grams', 'kcal', 'p', 'c', 'f']))

const PARSE_PROMPT = `Split this spoken meal description into food items. For each give: a short generic name a food database would use (no quantity in it), the quantity and unit as said, and your best estimate of the total grams.
Text: `
// Audio -> text, for the desktop app: Electron has no browser speech recognition.
const transcribe = async ({ audio, mime }) => gemini([{ text: 'Transcribe this audio exactly. It is someone saying what they ate.' }, { inline_data: { mime_type: mime || 'audio/webm', data: audio } }],
  { type: 'OBJECT', properties: { text: { type: 'STRING' } }, required: ['text'] })

const parse = ({ text }) => gemini([{ text: PARSE_PROMPT + JSON.stringify(text) }],
  ITEMS({ name: { type: 'STRING' }, qty: { type: 'NUMBER' }, unit: { type: 'STRING' }, grams: { type: 'NUMBER' } }, ['name', 'grams']))

// Per-serving nutrition for an imported recipe that has none (TheMealDB lists ingredients only).
const recipeNutrition = ({ title, servings, ingredients }) => gemini([{ text: `Estimate nutrition PER SERVING for this recipe, which makes ${servings || 4} servings. Use typical USDA values for each ingredient amount, add them up, divide by servings.
Recipe: ${title}
Ingredients:
${(ingredients || []).join('\n')}` }], { type: 'OBJECT', properties: { kcal: { type: 'NUMBER' }, p: { type: 'NUMBER' }, c: { type: 'NUMBER' }, f: { type: 'NUMBER' } }, required: ['kcal', 'p', 'c', 'f'] })

function titleCase(s = '') {
  return s.toLowerCase().replace(/(^|[\s,(-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
}

// ---------- routes ----------
const routes = {
  'GET /api/status': () => ({ ...has, mealdb: true }),
  'GET /api/usda/search': q => usdaSearch(q.get('q')),
  'GET /api/usda/barcode': q => usdaBarcode(q.get('code')),
  'GET /api/fatsecret/search': q => fatsecretSearch(q.get('q')),
  'GET /api/fatsecret/barcode': q => fatsecretBarcode(q.get('code')),
  'GET /api/edamam/search': q => edamam({ ingr: q.get('q') }),
  'GET /api/edamam/barcode': q => edamam({ upc: q.get('code') }).then(r => r[0] || null),
  'GET /api/recipes': q => recipes({ q: q.get('q'), maxKcal: q.get('maxKcal'), minProtein: q.get('minProtein') }),
  'POST /api/photo': (_, body) => photo(body),
  'POST /api/parse': (_, body) => parse(body),
  'POST /api/transcribe': (_, body) => transcribe(body),
  // Open Food Facts' search service ranks by product name; the old search.pl matches ingredient
  // text too. It sends no CORS headers, so the app reaches it through here.
  'GET /api/off/search': q => cached('off:' + (q.get('q') || '').toLowerCase(), async () => ({ products: (await getJSON(`https://search.openfoodfacts.org/search?page_size=30&langs=en&fields=code,product_name,brands,nutriments,serving_size,serving_quantity&q=${encodeURIComponent(q.get('q') || '')}`)).hits || [] })),
  'GET /api/mealdb/categories': () => mealdbCategories(),
  'GET /api/mealdb/search': q => mealdbList(q),
  'POST /api/recipe-import': (_, body) => recipeImport(body),
  'POST /api/recipe-nutrition': (_, body) => recipeNutrition(body),
}
const needs = { usda: 'usda', fatsecret: 'fatsecret', edamam: 'edamam', recipes: 'spoonacular', photo: 'gemini', parse: 'gemini', transcribe: 'gemini', 'recipe-nutrition': 'gemini' }

// One API call -> { code, body }. The dev server below and the desktop app (electron/main.mjs) both use it.
export async function api(method, pathname, params, body) {
  const route = routes[`${method} ${pathname}`]
  if (!route) return { code: 404, body: { error: 'no such route' } }
  const source = needs[pathname.split('/')[2]]
  if (source && !has[source]) return { code: 503, body: { error: `${source} key not set in .env` } }
  try {
    return { code: 200, body: await route(params, body) }
  } catch (e) {
    console.error(e.message)
    return { code: 502, body: { error: e.message } }
  }
}

// Standalone (npm run proxy): serve the API over HTTP for vite's dev server.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    let body = null
    if (req.method === 'POST') {
      const chunks = []
      for await (const c of req) chunks.push(c)
      try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}') } catch { body = {} }
    }
    const out = await api(req.method, url.pathname, url.searchParams, body)
    res.writeHead(out.code, { 'content-type': 'application/json' })
    res.end(JSON.stringify(out.body))
  }).listen(PORT, () => console.log(`proxy on :${PORT}`, has))
}
