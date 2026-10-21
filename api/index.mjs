// The hosted API on Vercel: every /api/* request lands here (vercel.json) and goes to the same
// api() the dev proxy and the desktop app use. Keys are Vercel environment variables, not .env.
import { api } from '../server/proxy.mjs'

export default async function handler(req, res) {
  // The phone apps call this from another origin (https://localhost, capacitor://localhost).
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const url = new URL(req.url, 'http://x')
  // vercel.json rewrites /api/usda/search?q=x to /api?route=usda/search&q=x
  const route = url.searchParams.get('route')
  url.searchParams.delete('route')
  const pathname = route != null ? '/api/' + route : url.pathname
  const body = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) : null
  const out = await api(req.method, pathname, url.searchParams, body)
  res.status(out.code).json(out.body)
}
