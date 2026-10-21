// Draw the chosen app icon (icons/chosen.txt) into the Android and iOS projects.
// Android gets an adaptive icon: the mark alone on a transparent layer, kept inside the
// center 66% that every launcher mask leaves visible, over the icon's background color.
// iOS masks the corners itself, so it gets the full square at 1024 px.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const id = fs.readFileSync(path.join(root, 'icons', 'chosen.txt'), 'utf8').trim()
const svg = fs.readFileSync(path.join(root, 'icons', id + '.svg'), 'utf8')
const bg = /<rect[^>]*width="512"[^>]*fill="(#[0-9a-f]{6})"/i.exec(svg)?.[1] || '#ffffff'
const mark = svg.replace(/<rect[^>]*width="512"[^>]*\/>/, '')            // without the background tile
const square = svg.replace(/(<rect[^>]*width="512"[^>]*?)\s*rx="\d+"/, '$1') // background without round corners
const png = (src, size) => new Resvg(src, { fitTo: { mode: 'width', value: size } }).render().asPng()
const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data) }

const res = path.join(root, 'android', 'app', 'src', 'main', 'res')
if (fs.existsSync(res)) {
  // The foreground layer is 108 dp with 72 dp visible: shrink the 512 mark into the middle 66%.
  const fg = mark.replace(/viewBox="0 0 512 512"/, 'viewBox="-132 -132 776 776"')
  for (const [d, k] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    write(path.join(res, `mipmap-${d}`, 'ic_launcher.png'), png(svg, 48 * k))
    write(path.join(res, `mipmap-${d}`, 'ic_launcher_round.png'), png(svg.replace(/rx="\d+"/, 'rx="256"'), 48 * k))
    write(path.join(res, `mipmap-${d}`, 'ic_launcher_foreground.png'), png(fg, 108 * k))
  }
  write(path.join(res, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${bg.toUpperCase()}</color>\n</resources>\n`)
  console.log('android icons:', id)
}

const ios = path.join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png')
if (fs.existsSync(path.dirname(ios))) { write(ios, png(square, 1024)); console.log('ios icon:', id) }
