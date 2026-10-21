// FitNext app icon concepts: writes icons/<id>.svg (512 x 512) and the gallery page
// ../concepts/fitnext-icons.html. Plain shapes only, no fonts, so any of them rasterises to .ico/.png.
//
//   node scripts/make-icons.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const bg = fill => `<rect width="512" height="512" rx="112" fill="${fill}"/>`
const line = (pts, color, w, extra = '') => `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`
const lin = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
const ring = (color, w = 56) => `<path d="M256 106 A150 150 0 1 1 106 256" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/><polygon points="44,262 168,262 106,172" fill="${color}" stroke="${color}" stroke-width="10" stroke-linejoin="round"/>`

// [id, name, theme it comes from, idea, (uid) => svg body]
const ICONS = [
  ['ring-next', 'Ring Next', 'Glacier', 'The daily calorie ring, closing with an arrow forward.', () =>
    bg('#1f5fd1') + ring('#fff')],
  ['double-chevron', 'Fast Forward', 'Glacier', 'Two chevrons: the next set, the next meal.', () =>
    bg('#1f5fd1') + line('150,140 250,256 150,372', '#a9c6ff', 64) + line('262,140 362,256 262,372', '#fff', 64)],
  ['f-arrow', 'F Forward', 'Glacier', 'An F whose middle bar runs on as an arrow.', () =>
    bg('#0e2238') + line('340,136 176,136 176,392', '#fff', 56) + line('176,256 366,256', '#5b9cff', 56) + line('320,200 384,256 320,312', '#5b9cff', 56)],
  ['n-pulse', 'N Pulse', 'Glacier', 'A heartbeat line that draws the N.', () =>
    bg('#1f5fd1') + line('64,284 146,284 192,148 320,364 366,228 448,228', '#fff', 44)],
  ['dumbbell-arrow', 'Dumbbell Next', 'Glacier light', 'A dumbbell whose far end is an arrowhead.', () =>
    bg('#edf2f8') + `<g fill="#1f5fd1"><rect x="80" y="166" width="48" height="180" rx="16"/><rect x="138" y="196" width="38" height="120" rx="14"/><rect x="306" y="196" width="38" height="120" rx="14"/></g>` +
    line('176,256 306,256', '#1f5fd1', 34) + line('370,176 450,256 370,336', '#0e2238', 44)],
  ['plate-play', 'Plate Play', 'Glacier', 'A weight plate with a start button in the middle.', () =>
    bg('#0e2238') + `<circle cx="256" cy="256" r="172" fill="#1f5fd1"/><circle cx="256" cy="256" r="124" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="10"/>` +
    `<polygon points="226,192 226,320 322,256" fill="#fff" stroke="#fff" stroke-width="26" stroke-linejoin="round"/>`],
  ['fork-dumbbell', 'Train + Fuel', 'Glacier', 'A fork crossed with a dumbbell: both halves of the app.', () =>
    bg('#1f5fd1') +
    `<g transform="translate(256 256) rotate(-45)">${line('-140,0 140,0', '#a9c6ff', 30)}<rect x="-178" y="-62" width="38" height="124" rx="12" fill="#a9c6ff"/><rect x="140" y="-62" width="38" height="124" rx="12" fill="#a9c6ff"/></g>` +
    `<g transform="translate(256 256) rotate(45)">${line('0,-40 0,176', '#fff', 30)}${line('-42,-176 -42,-92', '#fff', 22)}${line('0,-176 0,-92', '#fff', 22)}${line('42,-176 42,-92', '#fff', 22)}<path d="M-42 -96 Q-42 -40 0 -40 Q42 -40 42 -96" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round"/></g>`],
  ['leaf-bar', 'Leaf Bar', 'Bloom', 'A leaf whose vein is a barbell.', () =>
    bg('#4f7d61') + `<path d="M256 88 C392 150 402 310 256 424 C110 310 120 150 256 88 Z" fill="#f3f5f0"/>` +
    line('256,140 256,392', '#4f7d61', 14) + line('184,272 328,272', '#4f7d61', 18) +
    `<rect x="164" y="236" width="20" height="72" rx="8" fill="#4f7d61"/><rect x="328" y="236" width="20" height="72" rx="8" fill="#4f7d61"/>`],
  ['steps', 'Next Step', 'Glacier', 'Stairs going up, one step at a time.', () =>
    bg('#1f5fd1') + `<path d="M96 416 V344 H184 V272 H272 V200 H360 V112 H416 Q432 112 432 128 V400 Q432 416 416 416 Z" fill="#fff" stroke="#fff" stroke-width="16" stroke-linejoin="round"/>`],
  ['up-right', 'Up and Right', 'Lagoon', 'The progress arrow inside a ring.', () =>
    bg('#0f8f86') + `<circle cx="256" cy="256" r="150" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="36"/>` +
    line('196,316 316,196', '#fff', 40) + line('226,196 316,196 316,286', '#fff', 40)],
  ['fn-monogram', 'FN Monogram', 'Polar Night', 'F and N set side by side, N in the accent.', () =>
    bg('#0b1524') + line('236,128 128,128 128,384', '#fff', 44) + line('128,252 212,252', '#fff', 44) + line('264,384 264,128 384,384 384,128', '#5b9cff', 44)],
  ['kettlebell-play', 'Kettlebell Go', 'Ember', 'A kettlebell with a play button cut out of it.', () =>
    bg('#e0582a') + `<path d="M190 214 V176 A66 66 0 0 1 322 176 V214" fill="none" stroke="#faf3ee" stroke-width="40" stroke-linecap="round"/>` +
    `<circle cx="256" cy="304" r="124" fill="#faf3ee"/><polygon points="230,254 230,354 312,304" fill="#e0582a" stroke="#e0582a" stroke-width="18" stroke-linejoin="round"/>`],
  ['pulse-chevron', 'Pulse Forward', 'Crimson', 'A heartbeat that ends in a chevron.', () =>
    bg('#140c0d') + line('56,272 150,272 192,168 248,356 290,236 324,272', '#ff4d5e', 36) + line('360,190 438,272 360,354', '#f5e9ea', 40)],
  ['apple-chevron', 'Apple Next', 'Ember', 'An apple whose leaf is a chevron.', () =>
    bg('#faf3ee') + `<path d="M256 176 C200 134 108 152 108 264 C108 364 180 434 230 424 C246 421 266 421 282 424 C332 434 404 364 404 264 C404 152 312 134 256 176 Z" fill="#e0582a"/>` +
    line('254,72 298,114 254,156', '#4f7d61', 28)],
  ['torso', 'Muscle Map', 'Polar Night', 'The body map: chest, shoulders and abs lit up.', () =>
    bg('#0b1524') + `<g fill="#5b9cff"><circle cx="118" cy="182" r="38" opacity=".7"/><circle cx="394" cy="182" r="38" opacity=".7"/>` +
    `<path d="M150 168 Q170 138 248 148 L248 240 Q190 262 152 232 Z"/><path d="M362 168 Q342 138 264 148 L264 240 Q322 262 360 232 Z"/>` +
    [262, 312, 362].map(y => `<rect x="208" y="${y}" width="42" height="42" rx="12" opacity=".45"/><rect x="262" y="${y}" width="42" height="42" rx="12" opacity=".45"/>`).join('') + `</g>`],
  ['split-ring', 'Split Ring', 'Glacier + Bloom', 'Half training blue, half food green, around a chevron.', () =>
    bg('#edf2f8') + `<path d="M256 406 A150 150 0 0 1 256 106" fill="none" stroke="#1f5fd1" stroke-width="56"/><path d="M256 106 A150 150 0 0 1 256 406" fill="none" stroke="#4f7d61" stroke-width="56"/>` +
    line('230,204 282,256 230,308', '#0e2238', 36)],
  ['flame-up', 'Burn Up', 'Ember', 'A flame with an up arrow inside.', () =>
    bg('#2c1a10') + `<path d="M256 88 C300 166 382 200 372 302 C364 382 302 424 256 424 C200 424 140 382 140 300 C140 228 198 208 210 148 C238 188 250 208 256 88 Z" fill="#e0582a"/>` +
    line('256,384 256,284', '#faf3ee', 30) + line('214,326 256,284 298,326', '#faf3ee', 30)],
  ['macro-bars', 'Macro Bars', 'Glacier light', 'Protein, carbs and fat as three rising bars.', () =>
    bg('#edf2f8') + `<rect x="112" y="268" width="80" height="140" rx="24" fill="#1f5fd1"/><rect x="216" y="204" width="80" height="204" rx="24" fill="#0f8f86"/><rect x="320" y="128" width="80" height="280" rx="24" fill="#f0a530"/>`],
  ['neon-ring', 'Neon Ring', 'Polar Night', 'The ring, glowing on a dark ground.', u =>
    bg('#0b1524') + `<defs><filter id="${u}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter></defs>` +
    `<g filter="url(#${u}g)" opacity=".8">${ring('#5b9cff', 48)}</g>${ring('#bcd6ff', 40)}`],
  ['aurora-f', 'Aurora F', 'Aurora', 'A glass tile with an F, over the aurora gradient.', u =>
    lin(u + 'a', '#7cf0c7', '#6a43d6') + bg(`url(#${u}a)`) + `<rect x="112" y="112" width="288" height="288" rx="72" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-opacity=".5" stroke-width="6"/>` +
    line('320,172 200,172 200,340', '#fff', 46) + line('200,256 290,256', '#fff', 46)],
  ['next-track', 'Next Track', 'Carbon', 'The music player "next" button, black and white.', () =>
    bg('#0c0c0e') + `<polygon points="168,160 168,352 312,256" fill="#f2f2f4" stroke="#f2f2f4" stroke-width="28" stroke-linejoin="round"/><rect x="340" y="146" width="44" height="220" rx="14" fill="#f2f2f4"/>`],
  ['plates', 'Loaded Bar', 'Crimson', 'A barbell loaded with plates, seen side on.', () =>
    bg('#140c0d') + line('64,256 448,256', '#f5e9ea', 18) +
    `<g fill="#ff4d5e">${[[176, 120], [146, 180], [116, 240]].map(([x, h]) => `<rect x="${x}" y="${256 - h / 2}" width="26" height="${h}" rx="8"/><rect x="${512 - x - 26}" y="${256 - h / 2}" width="26" height="${h}" rx="8"/>`).join('')}</g>`],
  ['drop', 'Water Drop', 'Lagoon', 'A water drop with a chevron, for hydration.', () =>
    bg('#ecf6f5') + `<path d="M256 84 C256 84 128 236 128 310 A128 128 0 0 0 384 310 C384 236 256 84 256 84 Z" fill="#0f8f86"/>` + line('230,268 276,314 230,360', '#fff', 30)],
  ['hex-n', 'Hex N', 'Grape', 'An N inside a hexagon, like a gym badge.', () =>
    bg('#6a43d6') + `<polygon points="256,86 403,171 403,341 256,426 109,341 109,171" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="28" stroke-linejoin="round"/>` +
    line('196,326 196,186 316,326 316,186', '#fff', 40)],
  ['heart-dumbbell', 'Heart Lift', 'Rose', 'A heart holding a dumbbell.', () =>
    bg('#d23f6b') + `<path d="M256 404 C120 312 88 232 118 180 C148 128 220 128 256 190 C292 128 364 128 394 180 C424 232 392 312 256 404 Z" fill="#fbf1f3"/>` +
    line('196,250 316,250', '#d23f6b', 20) + `<rect x="172" y="214" width="24" height="72" rx="8" fill="#d23f6b"/><rect x="316" y="214" width="24" height="72" rx="8" fill="#d23f6b"/>`],
  ['dot-grid', 'Streak Dots', 'Sandstone', 'The consistency grid, filling in toward today.', () =>
    bg('#f4ece0') + Array.from({ length: 16 }, (_, i) => {
      const x = 148 + (i % 4) * 72, y = 148 + Math.floor(i / 4) * 72
      const o = [.2, .35, .2, .5, .35, .6, .45, .7, .5, .75, .6, .85, .7, .85, .9, 1][i]
      return `<circle cx="${x}" cy="${y}" r="26" fill="#b07a3c" opacity="${o}"/>`
    }).join('')],
  ['heat-chevron', 'Heatmap Chevron', 'Glacier', 'A training heatmap whose busy days form a chevron.', () =>
    bg('#0e2238') + Array.from({ length: 25 }, (_, i) => {
      const c = i % 5, r = Math.floor(i / 5)
      const on = [[1, 0], [2, 1], [3, 2], [2, 3], [1, 4]].some(([a, b]) => a === c && b === r)
      return `<rect x="${100 + c * 64}" y="${100 + r * 64}" width="52" height="52" rx="12" fill="#5b9cff" opacity="${on ? 1 : .16}"/>`
    }).join('')],
  ['citrus', 'Citrus Slice', 'Citrus', 'A lime slice, for the food side.', () =>
    bg('#f6f8e6') + `<circle cx="256" cy="256" r="172" fill="#8fb31f"/><circle cx="256" cy="256" r="146" fill="#eef5c8"/>` +
    Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return line(`256,256 ${256 + 146 * Math.cos(a)},${256 + 146 * Math.sin(a)}`, '#8fb31f', 10) }).join('') +
    `<circle cx="256" cy="256" r="18" fill="#8fb31f"/>`],
  ['peak', 'Summit', 'Sage Dusk', 'A mountain with a flag on top: the PR.', () =>
    bg('#151a17') + `<polygon points="72,404 216,176 288,280 338,214 440,404" fill="#8fc09f" stroke="#8fc09f" stroke-width="16" stroke-linejoin="round"/>` +
    line('216,176 216,104', '#e8eee8', 12) + `<polygon points="216,104 282,124 216,144" fill="#e8eee8"/>`],
  ['launch', 'Launch', 'Ember', 'A thick arrow taking off, with speed lines.', u =>
    lin(u + 'e', '#f0a530', '#e0582a') + bg(`url(#${u}e)`) + line('156,356 352,160', '#fff', 60) + line('228,154 358,154 358,284', '#fff', 60) +
    line('104,300 150,254', '#fff', 22, 'opacity=".55"') + line('210,410 256,364', '#fff', 22, 'opacity=".55"')],
  ['stopwatch', 'Rest Timer', 'Glacier', 'A stopwatch with a chevron face.', () =>
    bg('#1f5fd1') + `<circle cx="256" cy="288" r="138" fill="none" stroke="#fff" stroke-width="36"/><rect x="222" y="90" width="68" height="38" rx="12" fill="#fff"/>` +
    line('256,128 256,150', '#fff', 24) + line('232,244 276,288 232,332', '#fff', 34)],
  ['bowl', 'Bowl and Bar', 'Bloom', 'A dumbbell resting over a bowl.', () =>
    bg('#4f7d61') + `<path d="M104 264 H408 A152 152 0 0 1 104 264 Z" fill="#f3f5f0"/>` + line('176,190 336,190', '#f3f5f0', 22) +
    `<rect x="150" y="148" width="26" height="84" rx="9" fill="#f3f5f0"/><rect x="336" y="148" width="26" height="84" rx="9" fill="#f3f5f0"/>`],
  ['infinity', 'Every Day', 'Polar Night', 'An infinity loop with plates on the ends.', () =>
    bg('#0b1524') + `<path d="M256 256 C210 186 128 186 128 256 C128 326 210 326 256 256 C302 186 384 186 384 256 C384 326 302 326 256 256 Z" fill="none" stroke="#5b9cff" stroke-width="40" stroke-linejoin="round"/>` +
    `<rect x="70" y="206" width="30" height="100" rx="10" fill="#e6eef8"/><rect x="412" y="206" width="30" height="100" rx="10" fill="#e6eef8"/>`],
  ['bolt', 'Bolt', 'Carbon', 'A lightning bolt, yellow on black.', () =>
    bg('#0c0c0e') + `<polygon points="296,72 160,288 248,288 216,440 356,212 268,212 316,72" fill="#f5d90a" stroke="#f5d90a" stroke-width="14" stroke-linejoin="round"/>`],
]

const svg = (body, uid) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body(uid)}</svg>`

fs.mkdirSync(path.join(root, 'icons'), { recursive: true })
for (const [id, , , , body] of ICONS) fs.writeFileSync(path.join(root, 'icons', id + '.svg'), svg(body, 'i') + '\n')

// ---------- gallery page ----------
const cards = ICONS.map(([id, name, theme, idea, body], i) => `
    <article class="card">
      <div class="big">${svg(body, 'b' + i)}</div>
      <div class="sizes" aria-hidden="true"><span class="s48">${svg(body, 'm' + i)}</span><span class="s24">${svg(body, 's' + i)}</span><span class="s16">${svg(body, 't' + i)}</span></div>
      <h2><span class="n">${String(i + 1).padStart(2, '0')}</span>${name}</h2>
      <p>${idea}</p>
      <div class="meta"><span class="chip">${theme}</span><code>${id}</code></div>
    </article>`).join('')

const html = `<title>FitNext Icons</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap">
<style>
/* Layout: one dense grid of tiles; each tile shows the icon big, then at taskbar sizes, so small-size legibility is judged side by side. */
:root {
  --bg: #edf2f8; --sf: #ffffff; --fg: #0e2238; --mu: #5b6b80; --ln: #d9e2ee; --ac: #1f5fd1;
  --font: 'Lexend', system-ui, sans-serif; --mono: ui-monospace, 'Cascadia Mono', Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0b1524; --sf: #13203a; --fg: #e6eef8; --mu: #8fa3bf; --ln: #22324f; --ac: #5b9cff; color-scheme: dark } }
:root[data-theme="dark"] { --bg: #0b1524; --sf: #13203a; --fg: #e6eef8; --mu: #8fa3bf; --ln: #22324f; --ac: #5b9cff; color-scheme: dark }
body { background: var(--bg); color: var(--fg); font-family: var(--font); font-weight: 300; }
.wrap { max-width: 1240px; margin: 0 auto; padding-block: 40px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
header { display: grid; gap: 10px; margin-bottom: 28px; max-width: 68ch; }
.eyebrow { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--ac); font-weight: 600; }
h1 { font-size: clamp(34px, 6vw, 56px); font-weight: 600; letter-spacing: -.02em; margin: 0; text-wrap: balance; }
header p { margin: 0; color: var(--mu); font-size: 16px; line-height: 1.55; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.card { background: var(--sf); border: 1px solid var(--ln); border-radius: 22px; padding: 18px; display: grid; gap: 10px; align-content: start; }
.big svg { width: 100%; max-width: 172px; height: auto; display: block; margin: 4px auto 0; filter: drop-shadow(0 8px 18px rgb(14 34 56 / .14)); }
.sizes { display: flex; align-items: end; justify-content: center; gap: 14px; padding: 10px; border-radius: 12px; background: var(--bg); }
.sizes svg { display: block; } .s48 svg { width: 48px; height: 48px; } .s24 svg { width: 24px; height: 24px; } .s16 svg { width: 16px; height: 16px; }
h2 { margin: 4px 0 0; font-size: 17px; font-weight: 600; display: flex; gap: 8px; align-items: baseline; }
.n { font-size: 12px; color: var(--mu); font-variant-numeric: tabular-nums; font-weight: 500; }
.card p { margin: 0; color: var(--mu); font-size: 14px; line-height: 1.45; }
.meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 2px; }
.chip { font-size: 12px; padding: 3px 10px; border-radius: 99px; background: var(--bg); color: var(--fg); font-weight: 500; }
code { font-family: var(--mono); font-size: 12px; color: var(--mu); }
</style>
<div class="wrap">
  <header>
    <div class="eyebrow">FitNext · app icon concepts</div>
    <h1>${ICONS.length} icons to pick from</h1>
    <p>Each tile shows the icon large, then at 48, 24 and 16 pixels, the sizes the taskbar, Start menu and window title bar use. Colors come from the app's own themes. Tell me a number (or two to mix) and it becomes the desktop app's icon.</p>
  </header>
  <section class="grid">${cards}
  </section>
</div>
`
fs.writeFileSync(path.join(root, '..', 'concepts', 'fitnext-icons.html'), html)
console.log(`${ICONS.length} icons -> icons/, gallery -> ../concepts/fitnext-icons.html`)
