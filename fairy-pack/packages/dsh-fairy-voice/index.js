import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { closeSync, openSync } from 'node:fs'
import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureVoiceRuntime } from './bootstrap.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE_CONFIG = join(HERE, 'voice.config.json')
const STATE_DIR = join(homedir(), '.dsh', 'fairy-voice')
const USER_CONFIG = join(STATE_DIR, 'voice.config.json')
const LOG_PATH = join(STATE_DIR, 'service.log')
const YAML_PATH = join(STATE_DIR, 'tts_infer.yaml')
const OUT_LOG_PATH = join(STATE_DIR, 'tts.out.log')
const ROUTE = '/fairy-voice'
const MAX_TEXT = 400
const UPSTREAM_TIMEOUT_MS = 240000

const DEFAULT_CONFIG = {
  port: 9880,
  device: 'cpu',
  autoStart: true,
  python: '',
  pythonPath: '',
  nltkData: '',
  apiScript: '',
  serviceDir: '',
  bertPath: '',
  hubertPath: '',
  t2sWeights: '',
  vitsWeights: '',
  refAudio: '',
  refText: '',
}

let config = null
let configStamp = ''
let child = null
let startingSince = 0
let warming = false
let warmDone = false

async function log(message) {
  try {
    await mkdir(STATE_DIR, { recursive: true })
    await appendFile(LOG_PATH, new Date().toISOString() + ' ' + message + '\n', 'utf8')
  }
  catch {
    /* logging is best effort */
  }
}

async function configFile() {
  try {
    await stat(USER_CONFIG)
    return USER_CONFIG
  }
  catch {
    return PACKAGE_CONFIG
  }
}

async function configStampOf() {
  try {
    const file = await configFile()
    const info = await stat(file)
    return file + ':' + String(info.mtimeMs) + ':' + String(info.size)
  }
  catch {
    return 'none'
  }
}

async function loadConfig() {
  /*
   * Re-read whenever the file on disk changes. A config edited while the
   * client is running used to stay invisible until a full restart, which
   * looked exactly like "the voice system stopped working".
   */
  const stamp = await configStampOf()
  if (config !== null && stamp === configStamp) return config
  let raw = {}
  try {
    raw = JSON.parse(await readFile(await configFile(), 'utf8'))
  }
  catch (error) {
    await log('config read failed: ' + String(error && error.message ? error.message : error))
  }
  let merged = Object.assign({}, DEFAULT_CONFIG, raw)
  if (merged.runtime !== undefined && merged.runtime.enabled === true && merged.runtime.root === '') {
    merged.runtime = Object.assign({}, merged.runtime, { root: join(STATE_DIR, 'runtime') })
  }
  if (merged.runtime !== undefined && merged.runtime.enabled === true && (!merged.python || !merged.apiScript)) {
    try {
      const booted = await ensureVoiceRuntime(merged, log)
      if (booted !== merged) {
        merged = booted
        await mkdir(STATE_DIR, { recursive: true })
        await writeFile(USER_CONFIG, JSON.stringify(merged, null, 2), 'utf8')
        await log('运行时自举完成，配置已写入 ' + USER_CONFIG)
      }
    }
    catch (error) {
      await log('运行时自举失败: ' + String(error && error.message ? error.message : error))
    }
  }
  config = merged
  configStamp = await configStampOf()
  return config
}

function probePort(port, timeoutMs) {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolvePort(value)
    }
    socket.setTimeout(timeoutMs === undefined ? 400 : timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

function slashes(value) {
  return String(value || '').replace(/\\/g, '/')
}

function yamlFor(cfg) {
  const cuda = cfg.device === 'cuda'
  const lines = [
    'custom:',
    '  bert_base_path: "' + slashes(cfg.bertPath) + '"',
    '  cnhuhbert_base_path: "' + slashes(cfg.hubertPath) + '"',
    '  device: ' + (cuda ? 'cuda' : 'cpu'),
    '  is_half: ' + (cuda ? 'true' : 'false'),
    '  t2s_weights_path: "' + slashes(cfg.t2sWeights) + '"',
    '  version: v2',
    '  vits_weights_path: "' + slashes(cfg.vitsWeights) + '"',
    '',
  ]
  return lines.join('\n')
}

async function warmUp(port) {
  warming = true
  const startedAt = Date.now()
  try {
    const body = {
      text: '你好。',
      text_lang: 'zh',
      ref_audio_path: (await loadConfig()).refAudio,
      prompt_text: (await loadConfig()).refText,
      prompt_lang: 'zh',
      text_split_method: 'cut5',
      batch_size: 1,
      media_type: 'wav',
      streaming_mode: false,
    }
    const response = await fetch('http://127.0.0.1:' + String(port) + '/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await response.arrayBuffer()
    warmDone = true
    await log('warmup done in ' + String(Math.round((Date.now() - startedAt) / 1000)) + 's')
  }
  catch (error) {
    await log('warmup failed: ' + String(error && error.message ? error.message : error))
  }
  finally {
    warming = false
  }
}

async function ensureService() {
  const cfg = await loadConfig()
  if (await probePort(cfg.port)) return { ready: true, started: false }
  if (!cfg.autoStart) return { ready: false, started: false, reason: 'auto-start-off' }
  if (child !== null && child.exitCode === null) return { ready: false, started: false, reason: 'starting' }
  if (Date.now() - startingSince < 20000) return { ready: false, started: false, reason: 'starting' }
  if (!cfg.python || !cfg.apiScript) return { ready: false, started: false, reason: 'not-configured' }
  try {
    await mkdir(STATE_DIR, { recursive: true })
    await writeFile(YAML_PATH, yamlFor(cfg), 'utf8')
    startingSince = Date.now()
    const args = ['-B', '-u', cfg.apiScript, '-a', '127.0.0.1', '-p', String(cfg.port), '-c', YAML_PATH]
    const env = Object.assign({}, process.env, {
      PYTHONUTF8: '1',
      PYTHONDONTWRITEBYTECODE: '1',
      HF_HUB_OFFLINE: '1',
      TRANSFORMERS_OFFLINE: '1',
    })
    if (cfg.nltkData) env.NLTK_DATA = cfg.nltkData
    if (cfg.pythonPath) {
      env.PYTHONPATH = env.PYTHONPATH ? cfg.pythonPath + ';' + env.PYTHONPATH : cfg.pythonPath
    }
    let output = 'ignore'
    try {
      output = openSync(OUT_LOG_PATH, 'a')
    }
    catch {
      output = 'ignore'
    }
    child = spawn(cfg.python, args, {
      cwd: cfg.serviceDir || dirname(cfg.apiScript),
      windowsHide: true,
      detached: false,
      stdio: ['ignore', output, output],
      env,
    })
    if (typeof output === 'number') {
      try {
        closeSync(output)
      }
      catch {
        /* the child owns the handle now */
      }
    }
    child.once('exit', (code) => {
      void log('service exited code=' + String(code))
      child = null
    })
    child.once('error', (error) => {
      void log('service spawn failed: ' + String(error && error.message ? error.message : error))
      child = null
    })
    await log('service spawn pid=' + String(child.pid) + ' port=' + String(cfg.port) + ' device=' + String(cfg.device))
    void (async () => {
      const deadline = Date.now() + 300000
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        if (await probePort(cfg.port, 800)) {
          await new Promise((resolve) => setTimeout(resolve, 1500))
          await warmUp(cfg.port)
          return
        }
        if (child === null) return
      }
    })()
    return { ready: false, started: true, reason: 'spawned' }
  }
  catch (error) {
    await log('service start failed: ' + String(error && error.message ? error.message : error))
    return { ready: false, started: false, reason: 'spawn-failed' }
  }
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req, limit) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        rejectBody(Object.assign(new Error('body-too-large'), { code: 'body-too-large' }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks)))
    req.on('error', rejectBody)
  })
}

async function statusPayload() {
  const cfg = await loadConfig()
  const ready = await probePort(cfg.port)
  const busy = child !== null || Date.now() - startingSince < 180000
  return {
    ready,
    port: cfg.port,
    device: cfg.device,
    starting: !ready && busy && cfg.autoStart,
    warming: ready && warming,
    reference: String(cfg.refAudio || '').split(/[\\/]/).pop() || '',
    weights: String(cfg.t2sWeights || '').split(/[\\/]/).pop() || '',
  }
}

async function synthesize(text) {
  const cfg = await loadConfig()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const upstream = await fetch('http://127.0.0.1:' + String(cfg.port) + '/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        text_lang: 'zh',
        ref_audio_path: cfg.refAudio,
        prompt_text: cfg.refText,
        prompt_lang: 'zh',
        text_split_method: 'cut5',
        batch_size: 1,
        media_type: 'wav',
        streaming_mode: false,
      }),
      signal: controller.signal,
    })
    if (!upstream.ok) {
      /* Keep the service's own reason: it names the bad path or parameter. */
      const detail = await upstream.text().catch(() => '')
      await log('upstream ' + String(upstream.status) + ': ' + detail.slice(0, 400).replace(/\s+/g, ' '))
      throw Object.assign(new Error('upstream-failed'), { code: 'upstream-failed' })
    }
    return Buffer.from(await upstream.arrayBuffer())
  }
  finally {
    clearTimeout(timer)
  }
}

async function handle(req, res, url) {
  const path = url.pathname
  if (path === ROUTE + '/status') {
    sendJson(res, 200, await statusPayload())
    return
  }
  if (path === ROUTE + '/start' && req.method === 'POST') {
    sendJson(res, 200, await ensureService())
    return
  }
  if (path === ROUTE + '/say' && req.method === 'POST') {
    let parsed
    try {
      parsed = JSON.parse((await readBody(req, 64 * 1024)).toString('utf8'))
    }
    catch {
      sendJson(res, 400, { error: 'invalid-json' })
      return
    }
    const text = parsed && typeof parsed.text === 'string' ? parsed.text.trim() : ''
    if (text.length === 0) {
      sendJson(res, 400, { error: 'empty-text' })
      return
    }
    if (Array.from(text).length > MAX_TEXT) {
      sendJson(res, 413, { error: 'text-too-large' })
      return
    }
    const cfg = await loadConfig()
    if (!(await probePort(cfg.port))) {
      void ensureService()
      sendJson(res, 503, { error: 'service-not-ready' })
      return
    }
    try {
      const audio = await synthesize(text)
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': audio.length,
        'Cache-Control': 'no-store',
      })
      res.end(audio)
    }
    catch (error) {
      await log('tts failed: ' + String(error && error.code ? error.code : '') + ' ' + String(error && error.message ? error.message : error))
      sendJson(res, 502, { error: 'synthesis-failed' })
    }
    return
  }
  sendJson(res, 404, { error: 'not-found' })
}

export const inject = ['webServer']

export function apply(ctx) {
  try {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: ROUTE,
      handler: (req, res) => {
        void (async () => {
          let url
          try {
            url = new URL(req.url || '/', 'http://fairy.invalid')
          }
          catch {
            sendJson(res, 400, { error: 'bad-url' })
            return
          }
          try {
            await handle(req, res, url)
          }
          catch (error) {
            await log('route failed: ' + String(error && error.message ? error.message : error))
            if (!res.headersSent) sendJson(res, 500, { error: 'internal' })
            else res.end()
          }
        })()
      },
    }),
    'fairy-voice: local speech bridge',
  )

  ctx.effect(() => {
    void loadConfig().then((cfg) => {
      if (cfg.autoStart) return ensureService()
      return undefined
    })
    return () => {
      if (child !== null && child.exitCode === null) {
        try {
          child.kill()
        }
        catch {
          /* ignore */
        }
      }
      child = null
    }
  }, 'fairy-voice: service supervision')
  }
  catch (error) {
    console.error('[fairy-voice] host apply failed', error)
  }
}
