/**
 * 首次启动时自举语音运行时。
 *
 * 设计：运行时由分发者打成 zip 放在任意可下载地址，包内根目录必须有
 * fairy-runtime.json 描述相对路径；模型另打一个 zip，同样由清单描述。
 * 这样插件本身不必知道 GPT-SoVITS 的目录结构，换版本只换 zip。
 *
 * runtime: {
 *   enabled: boolean, url, sha256, root,
 *   modelUrl, modelSha256, modelRoot
 * }
 */
import { createWriteStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const CHUNK = 1 << 20

async function download(url, dest, log) {
  const parts = Array.isArray(url) ? url : [url]
  await mkdir(dirname(dest), { recursive: true })
  const hash = createHash('sha256')
  let got = 0
  const file = createWriteStream(dest)
  for (let i = 0; i < parts.length; i += 1) {
    const label = parts.length > 1 ? '第 ' + (i + 1) + '/' + parts.length + ' 段 ' : ''
    const res = await fetch(parts[i], { redirect: 'follow' })
    if (!res.ok || res.body === null) throw new Error('下载失败 HTTP ' + res.status + '：' + parts[i])
    let lastLog = 0
    const base = got
    const source = Readable.fromWeb(res.body)
    source.on('data', (chunk) => {
      hash.update(chunk)
      got += chunk.length
      if (got - base - lastLog > 64 * CHUNK) {
        lastLog = got - base
        void log(label + '下载中 ' + (got / 1048576).toFixed(1) + ' MB')
      }
    })
    await new Promise((resolve, reject) => {
      source.on('end', resolve)
      source.on('error', reject)
      source.pipe(file, { end: false })
    })
  }
  await new Promise((resolve, reject) => { file.end(); file.on('finish', resolve); file.on('error', reject) })
  return { bytes: got, sha256: hash.digest('hex') }
}

/** 极简 zip 解包：只处理 stored 与 deflate，够用于发布包。 */
export async function unzip(zipPath, destDir) {
  const buf = await readFile(zipPath)
  let eocd = -1
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('不是有效的 zip：' + zipPath)
  const total = buf.readUInt16LE(eocd + 10)
  let ptr = buf.readUInt32LE(eocd + 16)
  const entries = []
  for (let n = 0; n < total; n += 1) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error('zip 目录损坏')
    const method = buf.readUInt16LE(ptr + 10)
    const compSize = buf.readUInt32LE(ptr + 20)
    const nameLen = buf.readUInt16LE(ptr + 28)
    const extraLen = buf.readUInt16LE(ptr + 30)
    const commentLen = buf.readUInt16LE(ptr + 32)
    const localOff = buf.readUInt32LE(ptr + 42)
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8').replace(/\\/g, '/')
    entries.push({ method, compSize, localOff, name })
    ptr += 46 + nameLen + extraLen + commentLen
  }
  await mkdir(destDir, { recursive: true })
  for (const e of entries) {
    const target = resolve(destDir, e.name)
    if (!target.startsWith(resolve(destDir))) throw new Error('zip 路径越界：' + e.name)
    if (e.name.endsWith('/')) { await mkdir(target, { recursive: true }); continue }
    const lh = e.localOff
    if (buf.readUInt32LE(lh) !== 0x04034b50) throw new Error('zip 本地头损坏：' + e.name)
    const dataStart = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28)
    const raw = buf.subarray(dataStart, dataStart + e.compSize)
    const data = e.method === 0 ? raw : e.method === 8 ? inflateRawSync(raw) : null
    if (data === null) throw new Error('不支持的压缩方式 ' + e.method + '：' + e.name)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, data)
  }
  return entries.length
}

async function fileSha256(path) {
  const buf = await readFile(path)
  return createHash('sha256').update(buf).digest('hex')
}

async function exists(path) {
  try { return (await stat(path)).isFile() } catch { return false }
}

function absolute(root, rel) { return rel === undefined || rel === '' ? '' : resolve(root, rel) }

/**
 * 返回补齐了运行时路径的配置；不需要或无法自举时原样返回。
 * @param config 当前配置对象，读取 config.runtime
 * @param log 日志函数
 */
export async function ensureVoiceRuntime(config, log) {
  const runtime = config.runtime ?? {}
  if (runtime.enabled !== true) return config
  const root = runtime.root || ''
  if (root === '') throw new Error('runtime.root 未设置')

  const manifestPath = join(root, 'fairy-runtime.json')
  if (!(await exists(manifestPath))) {
    if (!runtime.url) throw new Error('运行时缺失且未配置 runtime.url')
    await log('首次启动：开始下载语音运行时')
    const zip = join(root, 'runtime.zip')
    const got = await download(runtime.url, zip, log)
    if (runtime.sha256 && got.sha256.toLowerCase() !== runtime.sha256.toLowerCase()) {
      await rm(zip, { force: true })
      throw new Error('运行时校验失败：期望 ' + runtime.sha256 + ' 实际 ' + got.sha256)
    }
    await log('下载完成 ' + (got.bytes / 1048576).toFixed(1) + ' MB，开始解包')
    const n = await unzip(zip, root)
    await rm(zip, { force: true })
    await log('解包完成，' + n + ' 个条目')
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const next = { ...config }
  next.python = absolute(root, manifest.python)
  next.apiScript = absolute(root, manifest.apiScript)
  next.serviceDir = absolute(root, manifest.serviceDir)
  next.bertPath = absolute(root, manifest.bertPath)
  next.hubertPath = absolute(root, manifest.hubertPath)
  next.nltkData = absolute(root, manifest.nltkData ?? '')

  const model = manifest.model ?? {}
  const modelRoot = runtime.modelRoot || join(root, 'models')
  const modelManifest = join(modelRoot, 'fairy-model.json')
  if (model.url && !(await exists(modelManifest))) {
    await log('开始下载语音模型')
    const zip = join(modelRoot, 'model.zip')
    const got = await download(model.url, zip, log)
    if (model.sha256 && got.sha256.toLowerCase() !== model.sha256.toLowerCase()) {
      await rm(zip, { force: true })
      throw new Error('模型校验失败')
    }
    await unzip(zip, modelRoot)
    await rm(zip, { force: true })
  }
  if (await exists(modelManifest)) {
    const m = JSON.parse(await readFile(modelManifest, 'utf8'))
    next.t2sWeights = absolute(modelRoot, m.t2sWeights)
    next.vitsWeights = absolute(modelRoot, m.vitsWeights)
    next.refAudio = absolute(modelRoot, m.refAudio)
    next.refText = m.refText ?? next.refText
  }
  next.autoStart = true
  await log('运行时就绪：' + next.serviceDir)
  return next
}
