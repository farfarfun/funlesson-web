// 请求路由：
//   /api/**  → 反代到后端
//   其余      → 静态文件 + SPA 回退
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStaticHandler } from './static.js'
import { createProxyHandler } from './proxy.js'

const DEFAULT_STATIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

export function createServer(opts = {}) {
  const staticDir = opts.staticDir ?? DEFAULT_STATIC_DIR
  const backendBaseUrl = opts.backendBaseUrl ?? 'http://127.0.0.1:18812'

  const staticHandler = createStaticHandler(staticDir)
  const proxyHandler = createProxyHandler(backendBaseUrl)

  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://internal')

    if (url.pathname.startsWith('/api')) {
      proxyHandler(req, res)
      return
    }

    staticHandler(req, res)
  })
}

export function runServe(opts = {}) {
  const host = opts.host ?? '127.0.0.1'
  const port = opts.port ?? 8812
  const backendBaseUrl = opts.backendBaseUrl ?? 'http://127.0.0.1:18812'

  return new Promise((resolve, reject) => {
    const server = createServer({ staticDir: opts.staticDir, backendBaseUrl })
    server.on('error', reject)
    server.listen(port, host, () => {
      console.log(`funlesson-web 已启动：http://${host}:${port}`)
      console.log(`后端：${backendBaseUrl}`)
      resolve(server)
    })
  })
}
