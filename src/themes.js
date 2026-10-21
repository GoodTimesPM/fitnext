// Color themes. Layout, radii, motion and the Lexend font are the same in every theme (Glacier's);
// only these tokens change. bg page, sf card, sf2 inset, fg text, mu muted text, ln hairline,
// ac accent, acf text on accent, p/c/f protein/carbs/fat, ok good, warn over / missed.

export const THEMES = [
  { id: 'glacier', name: 'Glacier', dark: false, bg: '#edf2f8', sf: '#ffffff', sf2: '#e2eaf3', fg: '#0e2238', mu: '#5b7088', ln: '#d3dee9', ac: '#1f5fd1', acf: '#ffffff', p: '#1f5fd1', c: '#2fb3c9', f: '#9aa6e0', ok: '#20a77a', warn: '#e0573d' },
  { id: 'bloom', name: 'Bloom', dark: false, bg: '#f3f5f0', sf: '#ffffff', sf2: '#e7ede3', fg: '#24302a', mu: '#6f7d74', ln: '#dce4d6', ac: '#4f7d61', acf: '#ffffff', p: '#4f7d61', c: '#c58fb0', f: '#e2b36b', ok: '#4f7d61', warn: '#c27a5a' },
  { id: 'polar-night', name: 'Polar Night', dark: true, bg: '#0b1524', sf: '#132136', sf2: '#1b2c45', fg: '#e6eef8', mu: '#8a9bb3', ln: '#24364f', ac: '#5b9cff', acf: '#06101f', p: '#5b9cff', c: '#3fd0e0', f: '#a9b4f0', ok: '#3fcf9a', warn: '#ff7a5c' },
  { id: 'sage-dusk', name: 'Sage Dusk', dark: true, bg: '#151a17', sf: '#1d2420', sf2: '#26302a', fg: '#e8eee8', mu: '#93a398', ln: '#2f3a33', ac: '#8fc09f', acf: '#102016', p: '#8fc09f', c: '#e0a6c8', f: '#f0c47c', ok: '#8fc09f', warn: '#e29a78' },
  { id: 'ember', name: 'Ember', dark: false, bg: '#faf3ee', sf: '#ffffff', sf2: '#f3e6dc', fg: '#2c1a10', mu: '#82685a', ln: '#ecdccf', ac: '#e0582a', acf: '#ffffff', p: '#e0582a', c: '#f2a33a', f: '#b9806a', ok: '#3a9d6b', warn: '#c43b2f' },
  { id: 'lagoon', name: 'Lagoon', dark: false, bg: '#ecf6f5', sf: '#ffffff', sf2: '#dcefed', fg: '#0d2b2a', mu: '#557775', ln: '#cfe5e2', ac: '#0f8f86', acf: '#ffffff', p: '#0f8f86', c: '#3fb6e0', f: '#f0b45a', ok: '#2a9d5c', warn: '#e0604a' },
  { id: 'grape', name: 'Grape', dark: false, bg: '#f4f1fa', sf: '#ffffff', sf2: '#e9e3f5', fg: '#22183a', mu: '#6d6286', ln: '#ddd5ec', ac: '#6a43d6', acf: '#ffffff', p: '#6a43d6', c: '#e05a9b', f: '#f2b03d', ok: '#2fa37a', warn: '#e0573d' },
  { id: 'rose', name: 'Rose', dark: false, bg: '#fbf1f3', sf: '#ffffff', sf2: '#f5e2e7', fg: '#3a1621', mu: '#8a6470', ln: '#efd8de', ac: '#d23f6b', acf: '#ffffff', p: '#d23f6b', c: '#f09a5e', f: '#9d86d8', ok: '#2f9d74', warn: '#c43b2f' },
  { id: 'sandstone', name: 'Sandstone', dark: false, bg: '#f6f1e7', sf: '#fffdf8', sf2: '#eee5d4', fg: '#2d2617', mu: '#7d7158', ln: '#e5dac4', ac: '#a8742a', acf: '#ffffff', p: '#a8742a', c: '#5f9e8f', f: '#c96f4a', ok: '#5f9e6a', warn: '#c2492f' },
  { id: 'graphite', name: 'Graphite', dark: false, bg: '#f2f2f3', sf: '#ffffff', sf2: '#e6e6e8', fg: '#141416', mu: '#6b6b72', ln: '#dadadd', ac: '#1c1c1f', acf: '#ffffff', p: '#1c1c1f', c: '#7c7c85', f: '#b4b4bb', ok: '#2f9d62', warn: '#d9452f' },
  { id: 'citrus', name: 'Citrus', dark: false, bg: '#f7f8ec', sf: '#ffffff', sf2: '#edf0d8', fg: '#1f2410', mu: '#6c7356', ln: '#e2e6c8', ac: '#5d8f12', acf: '#ffffff', p: '#5d8f12', c: '#f0a20f', f: '#ee6b3f', ok: '#5d8f12', warn: '#d9452f' },
  { id: 'aurora', name: 'Aurora', dark: true, bg: '#0e0d1c', sf: '#18162c', sf2: '#221f3b', fg: '#ecebfb', mu: '#9894b8', ln: '#2c2848', ac: '#7cf0c7', acf: '#0b1a15', p: '#7cf0c7', c: '#b58cff', f: '#ff9ec7', ok: '#7cf0c7', warn: '#ff8a7a' },
  { id: 'crimson', name: 'Crimson', dark: true, bg: '#140c0d', sf: '#1f1415', sf2: '#2a1b1d', fg: '#f5e9ea', mu: '#ad9496', ln: '#362426', ac: '#ff4d5e', acf: '#ffffff', p: '#ff4d5e', c: '#ffb04a', f: '#c49cff', ok: '#4fd18f', warn: '#ff7a59' },
  { id: 'carbon', name: 'Carbon', dark: true, bg: '#0c0c0e', sf: '#161619', sf2: '#1f1f23', fg: '#f2f2f4', mu: '#8d8d96', ln: '#2a2a30', ac: '#f2f2f4', acf: '#0c0c0e', p: '#f2f2f4', c: '#9a9aa3', f: '#5c5c66', ok: '#4fd18f', warn: '#ff6a55' },
]
const MORE = [
  { id: 'fjord', name: 'Fjord', dark: true, bg: '#1d232e', sf: '#252c39', sf2: '#2e3646', fg: '#e5e9f0', mu: '#9aa3b5', ln: '#363f50', ac: '#88c0d0', acf: '#13202a', p: '#88c0d0', c: '#a3be8c', f: '#ebcb8b', ok: '#a3be8c', warn: '#d08770' },
  { id: 'forest', name: 'Forest', dark: true, bg: '#0f1a14', sf: '#16241c', sf2: '#1e2f25', fg: '#e3efe6', mu: '#8fa898', ln: '#29392f', ac: '#4fd18f', acf: '#07160e', p: '#4fd18f', c: '#e8c35a', f: '#f08a5d', ok: '#4fd18f', warn: '#ff7a59' },
  { id: 'espresso', name: 'Espresso', dark: true, bg: '#17110e', sf: '#221915', sf2: '#2d221c', fg: '#f3e9e2', mu: '#ab988b', ln: '#3a2c25', ac: '#d9a066', acf: '#1a0f08', p: '#d9a066', c: '#8fb8a8', f: '#c97a6b', ok: '#7fc48f', warn: '#ff7a59' },
  { id: 'neon', name: 'Neon', dark: true, bg: '#08080f', sf: '#12121d', sf2: '#1b1b2a', fg: '#f0f0ff', mu: '#9090b0', ln: '#26263a', ac: '#d4ff3f', acf: '#0b0f00', p: '#d4ff3f', c: '#3fe0ff', f: '#ff3fa4', ok: '#3fff9e', warn: '#ff5c5c' },
  { id: 'midnight', name: 'Midnight', dark: true, bg: '#05070d', sf: '#0d1220', sf2: '#151c2e', fg: '#e8edf8', mu: '#8590a8', ln: '#1d2538', ac: '#a78bfa', acf: '#130b2a', p: '#a78bfa', c: '#38bdf8', f: '#fb7185', ok: '#34d399', warn: '#fb7185' },
  { id: 'mint', name: 'Mint', dark: false, bg: '#eefaf5', sf: '#ffffff', sf2: '#dcf3ea', fg: '#0d2a20', mu: '#5a7a6e', ln: '#cdebdf', ac: '#13a072', acf: '#ffffff', p: '#13a072', c: '#3b8ee0', f: '#f0a33a', ok: '#13a072', warn: '#e0573d' },
  { id: 'sky', name: 'Sky', dark: false, bg: '#eef6fd', sf: '#ffffff', sf2: '#dcebf8', fg: '#0c2340', mu: '#587294', ln: '#cfe0f2', ac: '#0ea5e9', acf: '#ffffff', p: '#0ea5e9', c: '#22c55e', f: '#f59e0b', ok: '#16a34a', warn: '#ef4444' },
  { id: 'peach', name: 'Peach', dark: false, bg: '#fdf3ec', sf: '#ffffff', sf2: '#f8e3d5', fg: '#3a1f12', mu: '#8c6a58', ln: '#f1d8c8', ac: '#f2774b', acf: '#ffffff', p: '#f2774b', c: '#e9b949', f: '#b07cc6', ok: '#3a9d6b', warn: '#c43b2f' },
  { id: 'lavender', name: 'Lavender', dark: false, bg: '#f6f3fd', sf: '#ffffff', sf2: '#ebe5fa', fg: '#251b45', mu: '#73689a', ln: '#e0d8f4', ac: '#8b5cf6', acf: '#ffffff', p: '#8b5cf6', c: '#ec4899', f: '#14b8a6', ok: '#10b981', warn: '#ef4444' },
  { id: 'paper', name: 'Paper', dark: false, bg: '#fbfaf7', sf: '#ffffff', sf2: '#f1efe9', fg: '#1d1b16', mu: '#77736a', ln: '#e7e4dc', ac: '#2b6cb0', acf: '#ffffff', p: '#2b6cb0', c: '#c05621', f: '#6b46c1', ok: '#2f855a', warn: '#c53030' },
]
THEMES.push(...MORE)

// ---------- custom colors: a background and an accent, each as hue / saturation / lightness ----------
// Every other token is derived, so any pair stays readable: cards lift off the page, text
// contrasts with it, and the macro colors sit around the accent on the color wheel.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export function hsl(h, s, l) {
  s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}
export function toHsl(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
const lum = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b }

export function customTheme({ bg, ac }) {
  const dark = bg.l < 45
  const t = (dl, ds = 0) => hsl(bg.h, bg.s + ds, clamp(bg.l + dl, 0, 100))
  const accent = hsl(ac.h, ac.s, ac.l)
  return {
    id: 'custom', name: 'Custom', dark,
    bg: hsl(bg.h, bg.s, bg.l),
    sf: dark ? t(5) : bg.l > 93 ? '#ffffff' : t(Math.min(8, 100 - bg.l)),
    sf2: dark ? t(10) : t(-5),
    ln: dark ? t(14) : t(-10),
    fg: dark ? hsl(bg.h, Math.min(bg.s, 20), 93) : hsl(bg.h, Math.min(bg.s + 20, 60), 12),
    mu: dark ? hsl(bg.h, Math.min(bg.s, 18), 64) : hsl(bg.h, Math.min(bg.s + 10, 25), 42),
    ac: accent, acf: lum(accent) > 0.55 ? '#0b0b0f' : '#ffffff',
    p: accent, c: hsl((ac.h + 150) % 360, ac.s, ac.l), f: hsl((ac.h + 60) % 360, ac.s * 0.8, ac.l),
    ok: dark ? '#4fd18f' : '#2a9d6a', warn: dark ? '#ff7a5c' : '#d9452f',
  }
}

// custom: { on, bg: {h,s,l}, ac: {h,s,l} } from settings; when on it replaces the preset.
export function applyTheme(id, custom) {
  const t = custom?.on ? customTheme(custom) : THEMES.find(x => x.id === id) || THEMES[0]
  const root = document.documentElement
  for (const k of ['bg', 'sf', 'sf2', 'fg', 'mu', 'ln', 'ac', 'acf', 'p', 'c', 'f', 'ok', 'warn']) root.style.setProperty('--' + k, t[k])
  root.dataset.dark = t.dark ? '1' : '0'
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg)
}
