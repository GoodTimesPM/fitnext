// Serving units. People know "1 large egg" or "1 slice", not 50 g, so every food gets a list of
// units with their gram weight and a default that is the usual way to count it.
//   unit: { label, g }   label is singular without the count ("large egg", "slice", "cup").
// Sources: the food's own household measures (USDA survey foods, OFF serving size), then this
// table of common foods (gram weights from USDA FoodData Central), then g and oz.

const C = (re, ...units) => ({ re, units: units.map(([label, g]) => ({ label, g })) })

// Most specific first: "peanut butter" before "butter", "bagel" before "egg", "egg white" before "egg".
const COMMON = [
  C(/\begg ?white/, ['large egg white', 33]),
  C(/\begg ?yolk|\byolks?\b/, ['large egg yolk', 17]),
  C(/\bbagels?\b/, ['bagel', 105]),
  C(/english muffin/, ['muffin', 57]),
  C(/\bmuffins?\b/, ['muffin', 113]),
  C(/\bbread|\btoast/, ['slice', 28]),
  C(/\btortillas?\b/, ['tortilla', 45]),
  C(/\bpancakes?\b/, ['pancake', 38]),
  C(/\bwaffles?\b/, ['waffle', 35]),
  C(/\bdonuts?\b|\bdoughnuts?\b/, ['donut', 60]),
  C(/\bcookies?\b/, ['cookie', 16]),
  C(/\bpizza\b/, ['slice', 107]),
  C(/peanut butter|almond butter|nut butter/, ['tbsp', 16], ['2 tbsp', 32]),
  C(/\bbutter\b|\bmargarine\b/, ['tbsp', 14], ['tsp', 4.7]),
  C(/\boil\b/, ['tbsp', 13.6], ['tsp', 4.5]),
  C(/\bmayo|mayonnaise/, ['tbsp', 14]),
  C(/\bhoney\b|\bsyrup\b|\bjam\b|\bjelly\b/, ['tbsp', 21]),
  C(/\bsugar\b/, ['tsp', 4.2], ['tbsp', 12.5]),
  C(/\beggs?\b/, ['large egg', 50], ['medium egg', 44], ['extra large egg', 56]),
  C(/sweet potato/, ['medium sweet potato', 130]),
  C(/\bpotato/, ['medium potato', 173]),
  C(/\bbananas?\b/, ['medium banana', 118], ['small banana', 101], ['large banana', 136]),
  C(/\bapples?\b/, ['medium apple', 182]),
  C(/\boranges?\b/, ['medium orange', 131]),
  C(/\bpears?\b/, ['medium pear', 178]),
  C(/\bpeach(es)?\b/, ['medium peach', 150]),
  C(/\bavocados?\b/, ['avocado', 150], ['half avocado', 75]),
  C(/strawberr/, ['cup', 152], ['strawberry', 12]),
  C(/blueberr|raspberr|blackberr/, ['cup', 148]),
  C(/\bgrapes?\b/, ['cup', 151]),
  C(/\btomato(es)?\b/, ['medium tomato', 123]),
  C(/\bonions?\b/, ['medium onion', 110]),
  C(/\bcarrots?\b/, ['medium carrot', 61]),
  C(/broccoli/, ['cup', 91]),
  C(/spinach|lettuce|salad greens|kale/, ['cup', 30]),
  C(/\brice\b/, ['cup cooked', 158]),
  C(/\bpasta\b|spaghetti|macaroni|noodles/, ['cup cooked', 140]),
  C(/\boat/, ['half cup dry', 40], ['cup cooked', 234]),
  C(/cereal|granola/, ['cup', 30]),
  C(/\bmilk\b/, ['cup', 244], ['ml', 1.03]),
  C(/yogh?urt/, ['container', 170], ['cup', 245]),
  C(/\bcheese\b/, ['slice', 21], ['oz', 28.35]),
  C(/chicken breast/, ['breast', 172]),
  C(/chicken thigh/, ['thigh', 116]),
  C(/\bbacon\b/, ['slice', 8]),
  C(/\bsausages?\b/, ['link', 25]),
  C(/hot dog|frankfurter/, ['hot dog', 45]),
  C(/hamburger|burger patty|ground beef/, ['patty', 113]),
  C(/\bsalmon\b/, ['fillet', 154]),
  C(/\btuna\b/, ['can', 142]),
  C(/\balmonds?\b|\bwalnuts?\b|\bcashews?\b|\bpeanuts?\b|\bpistachios?\b|\bnuts?\b/, ['oz', 28.35], ['handful', 30]),
  C(/protein powder|whey|\bprotein shake/, ['scoop', 30]),
  C(/\bcoffee\b|\btea\b/, ['cup', 237]),
  C(/\bjuice\b/, ['cup', 248]),
  C(/\bsoda\b|\bcola\b|soft drink/, ['can', 355]),
  C(/\bbeer\b/, ['can', 356]),
  C(/\bwine\b/, ['glass', 147]),
  C(/\bchips\b|\bcrisps\b/, ['oz', 28.35]),
]

const BASE = [{ label: 'g', g: 1 }, { label: 'oz', g: 28.35 }]
const isMass = u => u.label === 'g' || u.label === 'oz'

// "1 egg (50 g)" -> "egg"; "2 tbsp" stays (a count that is part of the unit).
export function cleanLabel(s = '') {
  return s.replace(/\(.*?\)/g, '').replace(/^\s*1\s+/, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

// A package's own measure can carry a count: "0.5 pizza" (150 g) is a pizza of 300 g, "2 slices" (56 g) a slice of 28 g.
function perOne(label, g) {
  const m = /^\s*(\d+(?:[.,]\d+)?|½|¼)\s+(.+)$/.exec(cleanLabel(label))
  if (!m) return { label: cleanLabel(label), g }
  const n = { '½': 0.5, '¼': 0.25 }[m[1]] || +m[1].replace(',', '.')
  if (!n || /^(g|ml|oz)$/.test(m[2])) return { label: '', g }
  return { label: n === 1 ? m[2] : m[2].replace(/([^s])s$/, '$1'), g: g / n }
}

export function unitsFor(food) {
  if (food.perServing) return [{ label: cleanLabel(food.serving?.label) || 'serving', g: null }]
  const out = []
  const add = u => { if (u.label && u.g > 0 && !out.some(x => x.label === u.label)) out.push({ ...u, g: Math.round(u.g * 10) / 10 }) }
  for (const u of food.units || []) add(perOne(u.label, u.g))
  if (food.serving?.g && food.serving.g !== 100 && food.serving.label) add({ ...perOne(food.serving.label, food.serving.g), label: perOne(food.serving.label, food.serving.g).label || 'serving' })
  const name = (food.name || '').toLowerCase()
  const hit = COMMON.find(c => c.re.test(name))
  if (hit) hit.units.forEach(add)
  BASE.forEach(add)
  return out
}

// The usual way to count this food: its own household measure, then a common unit, then 100 g.
export function defaultUnit(food) {
  const units = unitsFor(food)
  if (food.perServing) return { ...units[0], amt: 1 }
  const u = units.find(x => !isMass(x))
  return u ? { ...u, amt: 1 } : { label: 'g', g: 1, amt: 100 }
}

// Grams (or servings) for an amount of a unit; the diary keeps this as qty.
export const qtyOf = (food, unit) => (food.perServing ? unit.amt : unit.amt * unit.g)

const ABBR = /^(g|oz|ml|tbsp|tsp|lb|kg|cup cooked|half cup dry|2 tbsp)$/
const plural = (label, amt) => {
  if (amt === 1 || ABBR.test(label) || /s$|\)$/.test(label)) return label
  return label.replace(/(\w+)$/, w => (/(ch|sh|x)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's'))
}
const fmtAmt = n => (Math.round(n * 100) / 100).toString()

// "2 large eggs", "150 g", "1.5 cups"
export const unitText = u => `${fmtAmt(u.amt)} ${plural(u.label, u.amt)}`

// How a diary entry reads, including entries logged before units existed.
export function entryText(e) {
  if (e.unit) return unitText(e.unit)
  return e.food.perServing ? `${e.qty} × ${e.food.serving.label}` : `${Math.round(e.qty)} g`
}
