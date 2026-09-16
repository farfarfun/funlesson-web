// 静态文件服务 + SPA 回退（照搬 funflix-web 的 server/static.js，服务路径改为站点根 `/`）：
// - `assets/**`（Vite 产物，文件名带内容 hash）未命中时直接 404，不回退 index.html，
//   否则浏览器会把一个本该是 JS/CSS 的 404 当成 HTML 解析，报错跟真实原因对不上。
// - 其他看起来像文件的路径（最后一段带 `.`，例如 favicon.ico）同样直接 404。
// - 除此之外的未命中一律回退到 index.html，交给前端路由处理。
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const ASSETS_PREFIX = 'assets/'
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable'
const NO_CACHE = 'no-cache'
const GZIP_MIN_SIZE = 1024

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

export const BUILD_HINT =
  '前端尚未构建。请先执行：\n' +
  '    pnpm install && pnpm build\n' +
  '构建产物会写入 dist/，之后重启服务即可。'

export async function frontendReady(staticDir) {
  try {
    const s = await stat(path.join(staticDir, 'index.html'))
    return s.isFile()
  } catch {
    return false
  }
}

function looksLikeFile(urlPath) {
  const name = urlPath.split('/').pop() ?? ''
  if (name === '' || name === '.' || name === '..') return false
  return name.includes('.')
}

// 把请求路径安全地解析到 staticDir 内部，拒绝 `..` 逃逸。
function safeResolve(staticDir, relPath) {
  const resolved = path.normalize(path.join(staticDir, relPath))
  const base = path.normalize(staticDir + path.sep)
  if (resolved !== path.normalize(staticDir) && !resolved.startsWith(base)) {
    return null
  }
  return resolved
}

async function statFile(filePath) {
  try {
    const s = await stat(filePath)
    return s.isFile() ? s : null
  } catch {
    return null
  }
}

function sendFile(res, req, filePath, size, cacheControl) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
    const acceptEncoding = req.headers['accept-encoding'] ?? ''
    const canGzip = size >= GZIP_MIN_SIZE && /\bgzip\b/.test(acceptEncoding)

    if (!canGzip) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': size,
        'Cache-Control': cacheControl,
      })
      const stream = createReadStream(filePath)
      stream.on('error', reject)
      stream.pipe(res)
      stream.on('close', resolve)
      return
    }

    const chunks = []
    const stream = createReadStream(filePath)
    stream.on('data', (c) => chunks.push(c))
    stream.on('error', reject)
    stream.on('end', () => {
      const gzipped = gzipSync(Buffer.concat(chunks))
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        'Content-Length': gzipped.length,
        'Cache-Control': cacheControl,
        Vary: 'Accept-Encoding',
      })
      res.end(gzipped)
      resolve()
    })
  })
}

// 站点根即前端根路径（不带 /web 前缀），staticDir 是 dist/ 的绝对路径。
export function createStaticHandler(staticDir) {
  return async function handleStatic(req, res) {
    if (!(await frontendReady(staticDir))) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(BUILD_HINT)
      return
    }

    const url = new URL(req.url, 'http://internal')
    let relPath = decodeURIComponent(url.pathname)
    if (relPath.startsWith('/')) relPath = relPath.slice(1)
    if (relPath === '') relPath = 'index.html'

    const servedFromAssets = relPath.startsWith(ASSETS_PREFIX)

    let target = safeResolve(staticDir, relPath)
    let fileStat = target ? await statFile(target) : null

    if (!fileStat && relPath.endsWith('/')) {
      target = safeResolve(staticDir, relPath + 'index.html')
      fileStat = target ? await statFile(target) : null
    }

    let servedIndexFallback = false
    if (!fileStat) {
      if (servedFromAssets || looksLikeFile(relPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not Found')
        return
      }
      target = path.join(staticDir, 'index.html')
      fileStat = await statFile(target)
      servedIndexFallback = true
      if (!fileStat) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not Found')
        return
      }
    }

    const cacheControl = servedFromAssets && !servedIndexFallback ? IMMUTABLE_CACHE : NO_CACHE
    await sendFile(res, req, target, fileStat.size, cacheControl)
  }
}
