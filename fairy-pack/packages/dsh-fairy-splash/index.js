import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/** The splash assets are public, inert files served for this bundle only. */
export const inject = ['webServer']

const ASSETS = new Map([
  ['/fairy-splash/v1/boot.mp4', {
    file: fileURLToPath(new URL('./assets/boot.mp4', import.meta.url)),
    type: 'video/mp4',
  }],
  ['/fairy-splash/v1/backdrop.png', {
    file: fileURLToPath(new URL('./assets/backdrop.png', import.meta.url)),
    type: 'image/png',
  }],
  ['/fairy-splash/v1/poster.jpg', {
    file: fileURLToPath(new URL('./assets/poster.jpg', import.meta.url)),
    type: 'image/jpeg',
  }],
  ['/fairy-splash/v1/icon.png', {
    file: fileURLToPath(new URL('./assets/icon-512.png', import.meta.url)),
    type: 'image/png',
  }],
  ['/fairy-splash/v1/icon-64.png', {
    file: fileURLToPath(new URL('./assets/icon-64.png', import.meta.url)),
    type: 'image/png',
  }],
  ['/fairy-splash/v1/app.ico', {
    file: fileURLToPath(new URL('./assets/app.ico', import.meta.url)),
    type: 'image/x-icon',
  }],
])

const ROUTE = '/fairy-splash'

function commonHeaders(type) {
  return {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  }
}

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value ?? '')
  if (match === null || (match[1] === '' && match[2] === '')) return null
  let start
  let end
  if (match[1] === '') {
    const suffix = Number(match[2])
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  }
  else {
    start = Number(match[1])
    end = match[2] === '' ? size - 1 : Number(match[2])
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null
  if (start < 0 || start >= size || end < start) return null
  return { start, end: Math.min(end, size - 1) }
}

async function serve(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Max-Age': '86400',
    })
    res.end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, OPTIONS' })
    res.end()
    return
  }

  let pathname
  try {
    pathname = new URL(req.url ?? '/', 'http://fairy.invalid').pathname
  }
  catch {
    res.writeHead(400)
    res.end()
    return
  }

  const asset = ASSETS.get(pathname)
  if (asset === undefined) {
    res.writeHead(404)
    res.end()
    return
  }

  let info
  try {
    info = await stat(asset.file)
  }
  catch {
    res.writeHead(404)
    res.end()
    return
  }
  if (!info.isFile()) {
    res.writeHead(404)
    res.end()
    return
  }

  const size = info.size
  const range = req.headers.range === undefined ? null : parseRange(req.headers.range, size)
  if (req.headers.range !== undefined && range === null) {
    res.writeHead(416, {
      ...commonHeaders(asset.type),
      'Content-Range': `bytes */${size}`,
    })
    res.end()
    return
  }

  if (range === null) {
    res.writeHead(200, {
      ...commonHeaders(asset.type),
      'Content-Length': String(size),
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = createReadStream(asset.file)
    stream.on('error', () => res.destroy())
    stream.pipe(res)
    return
  }

  const length = range.end - range.start + 1
  res.writeHead(206, {
    ...commonHeaders(asset.type),
    'Content-Length': String(length),
    'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
  })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  const stream = createReadStream(asset.file, { start: range.start, end: range.end })
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

/** Host half: serves the boot video and backdrop image to the page. */
export function apply(ctx) {
  try {
  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler: serve }),
    'fairy-splash: splash assets',
  )
  }
  catch (error) {
    console.error('[fairy-splash] host apply failed', error)
  }
}
