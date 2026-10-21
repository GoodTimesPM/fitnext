// Build the phone apps (Capacitor) from the same code as the web and desktop app.
//
//   npm run mobile                    build dist/ and copy it into android/ and ios/
//   npx cap open android              then Run in Android Studio, or Build > Generate Signed Bundle
//   npx cap open ios                  (on a Mac) then Product > Archive in Xcode
//
// The phone has no proxy of its own, so the API calls go to the hosted one (api/ on Vercel).
// Put its address in .env as VITE_API_BASE=https://your-app.vercel.app before building.
// CapacitorHttp (capacitor.config.json) sends fetch() through the native layer, so no CORS setup.

import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
try { process.loadEnvFile(path.join(root, '.env')) } catch { /* no .env */ }
if (!process.env.VITE_API_BASE) {
  console.warn('VITE_API_BASE is not set: food search by Open Food Facts and barcodes still work,\nbut USDA, recipes, photo and voice logging need the hosted API.\n')
}
const run = cmd => execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env })
run('node scripts/native-icons.mjs')
run('npx vite build')
run('npx cap sync')
