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
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const CHUNK = 1 << 20

/**
 * 分卷下载，带断点续传。
 *
 * 每一卷先写到 `<dest>.pN`，中断后下次从已有字节数继续（HTTP Range）。
 * 全部到齐后按顺序拼成 `dest`、校验 sha256、删除分卷。
 * 单连接是刻意的：并行分片在这类 CDN 上收益不稳定，而续传能救回最常见的失败——
 * 下到 90% 断线。
 */
async function download(url, dest, log, expectSha) {
  const parts = Array.isArray(url) ? url : [url]
  await mkdir(dirname(dest), { recursive: true })

  let totalHave = 0
  for (let i = 0; i < parts.length; i += 1) {
    const tmp = dest + '.p' + i
    const label = parts.length > 1 ? '第 ' + (i + 1) + '/' + parts.length + ' 段 ' : ''
    let have = 0
    try { have = (await stat(tmp)).size } catch { have = 0 }
    let resumed = have > 0
    let guard = 0
    while (guard < 3) {
      guard += 1
      const headers = have > 0 ? { Range: 'bytes=' + have + '-' } : {}
      const res = await fetch(parts[i], { redirect: 'follow', headers })
      if (res.status === 416) break
      if (!res.ok || res.body === null) throw new Error('下载失败 HTTP ' + res.status + '：' + parts[i])
      if (have > 0 && res.status !== 206) {
        // 服务端不认 Range，只能整卷重来
        await rm(tmp, { force: true })
        have = 0
        resumed = false
        continue
      }
      if (resumed) await log(label + '续传自 ' + (have / 1048576).toFixed(1) + ' MB')
      const out = createWriteStream(tmp, { flags: have > 0 ? 'a' : 'w' })
      let got = have
      let lastLog = got
      const source = Readable.fromWeb(res.body)
      source.on('data', (chunk) => {
        got += chunk.length
        if (got - lastLog > 64 * CHUNK) {
          lastLog = got
          void log(label + '下载中 ' + (got / 1048576).toFixed(1) + ' MB')
        }
      })
      await new Promise((resolve, reject) => {
        source.on('end', resolve)
        source.on('error', reject)
        source.pipe(out)
      })
      have = (await stat(tmp)).size
      break
    }
    totalHave += have
  }

  // 拼接并校验
  const hash = createHash('sha256')
  const out = createWriteStream(dest)
  for (let i = 0; i < parts.length; i += 1) {
    const tmp = dest + '.p' + i
    const buf = await readFile(tmp)
    hash.update(buf)
    await new Promise((resolve, reject) => out.write(buf, (e) => (e ? reject(e) : resolve())))
  }
  await new Promise((resolve, reject) => { out.end(); out.on('finish', resolve); out.on('error', reject) })
  const sha = hash.digest('hex')
  if (expectSha && sha.toLowerCase() !== String(expectSha).toLowerCase()) {
    throw new Error('校验失败：期望 ' + expectSha + '，实际 ' + sha)
  }
  for (let i = 0; i < parts.length; i += 1) await rm(dest + '.p' + i, { force: true })
  return { bytes: totalHave, sha256: sha }
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
    const zip = join(root, 'runtime.zip')
    const pre = join(root, 'fairy-runtime.zip')
    if (await exists(pre)) {
      // 手动下载的捷径：把 fairy-runtime.zip 放进 runtime 目录即可跳过下载
      await log('检测到已就位的 fairy-runtime.zip，跳过下载')
      await rm(zip, { force: true })
      await rename(pre, zip)
    }
    else {
      if (!runtime.url) throw new Error('运行时缺失且未配置 runtime.url')
      await log('首次启动：开始下载语音运行时')
      await download(runtime.url, zip, log, runtime.sha256)
    }
    if (runtime.sha256) {
      const real = await fileSha256(zip)
      if (real.toLowerCase() !== String(runtime.sha256).toLowerCase()) {
        await rm(zip, { force: true })
        throw new Error('运行时校验失败：期望 ' + runtime.sha256 + ' 实际 ' + real)
      }
    }
    const got = { bytes: (await stat(zip)).size }
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
