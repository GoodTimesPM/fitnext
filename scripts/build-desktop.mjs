// Build FitNext.exe and point a desktop shortcut at it.
//
//   npm run desktop                   icon from icons/chosen.txt (ring-next if none)
//   npm run desktop -- --icon bolt    any id from icons/ (see concepts/fitnext-icons.html)
//   npm run installer                 release/FitNext-Setup-<version>.exe, for other people
//   npm run release                   the same, uploaded as a GitHub release (needs GH_TOKEN);
//                                     installed copies update themselves from it
//
// Output: release/win-unpacked/FitNext.exe. Your data is not in there: it lives in
// %APPDATA%\FitNext, so rebuilding never touches workouts or the food diary.

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const run = cmd => execSync(cmd, { cwd: root, stdio: 'inherit' })
const exe = path.join(root, 'release', 'win-unpacked', 'FitNext.exe')

// Windows will not overwrite a running exe, and the builder only says so at the very end.
if (fs.existsSync(exe)) {
  try { fs.closeSync(fs.openSync(exe, 'r+')) } catch { console.error('FitNext is running. Close its window, then build again.'); process.exit(1) }
}

// Icon: render the chosen SVG to PNG for the exe (the builder makes the .ico) and the window.
const arg = process.argv.indexOf('--icon')
const chosenFile = path.join(root, 'icons', 'chosen.txt')
const icon = arg > 0 ? process.argv[arg + 1] : fs.existsSync(chosenFile) ? fs.readFileSync(chosenFile, 'utf8').trim() : 'ring-next'
const svg = path.join(root, 'icons', icon + '.svg')
if (!fs.existsSync(svg)) { console.error(`No icon "${icon}" in icons/.`); process.exit(1) }
fs.writeFileSync(chosenFile, icon + '\n')
const png = new Resvg(fs.readFileSync(svg), { fitTo: { mode: 'width', value: 512 } }).render().asPng()
fs.mkdirSync(path.join(root, 'build'), { recursive: true })
fs.writeFileSync(path.join(root, 'build', 'icon.png'), png)
fs.writeFileSync(path.join(root, 'electron', 'icon.png'), png)
fs.copyFileSync(svg, path.join(root, 'public', 'icon.svg')) // the web app and PWA use the same mark
// PNGs for phones installing the web app: Android wants 192/512 and a maskable one (mark inside the
// center 80%), iOS an apple-touch-icon without transparency.
const src = fs.readFileSync(svg, 'utf8')
const toPng = (text, size) => new Resvg(text, { fitTo: { mode: 'width', value: size } }).render().asPng()
const tile = src.replace(/(<rect[^>]*width="512"[^>]*?)\s*rx="\d+"/, '$1')
fs.writeFileSync(path.join(root, 'public', 'icon-192.png'), toPng(src, 192))
fs.writeFileSync(path.join(root, 'public', 'icon-512.png'), toPng(src, 512))
fs.writeFileSync(path.join(root, 'public', 'icon-maskable.png'), toPng(tile.replace(/(<\/rect>|\/>)/, '$1<g transform="translate(51 51) scale(.8)">').replace(/<\/svg>\s*$/, '</g></svg>'), 512))
fs.writeFileSync(path.join(root, 'public', 'apple-touch-icon.png'), toPng(tile, 180))
console.log(`icon: ${icon}`)

const home = path.join(root, 'electron', 'home.json')
if (process.argv.includes('--installer')) {
  // A build for other people must not carry this machine's folder path.
  fs.rmSync(home, { force: true })
  run('npx vite build')
  run(`npx electron-builder --win nsis --publish ${process.argv.includes('--publish') ? 'always' : 'never'}`)
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  console.log(`\nBuilt ${path.join(root, 'release', `FitNext-Setup-${version}.exe`)}`)
  process.exit(0)
}

// Where the source tree is, so the exe finds this folder's .env (see electron/main.mjs).
fs.writeFileSync(home, JSON.stringify({ app: root }) + '\n')

run('npx vite build')
run('npx electron-builder --win dir')

// Desktop shortcut, like the other apps on this machine. Windows caches an exe's icon by its path,
// so after an icon change the shortcut would keep the old one. It points at an .ico named after the
// icon instead: a new name is a new cache entry.
const ico = path.join(root, 'build', `icon-${icon}.ico`)
fs.copyFileSync(path.join(root, 'release', '.icon-ico', 'icon.ico'), ico)
const desktop = path.join(os.homedir(), 'Desktop', 'FitNext.lnk')
const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${desktop}');$s.TargetPath='${exe}';$s.WorkingDirectory='${path.dirname(exe)}';$s.IconLocation='${ico},0';$s.Description='FitNext';$s.Save()`
execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'inherit' })
console.log(`\nBuilt ${exe}\nShortcut: ${desktop}`)
