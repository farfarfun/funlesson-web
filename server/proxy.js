// 反向代理到 funlesson 后端。只用内置 http/https，不加第三方依赖。
// 存在的理由：前端独立部署后必须走同源，由这一层把 /api 转发到真实后端，
// 浏览器眼里全程只有一个源，避免跨域/访问问题。
import http from 'node:http'
import https from 'node:https'

export function createProxyHandler(backendBaseUrl) {
  const backend = new URL(backendBaseUrl)
  const transport = backend.protocol === 'https:' ? https : http

  return function handleProxy(req, res) {
    const headers = { ...req.headers, host: backend.host }

    const proxyReq = transport.request(
      {
        protocol: backend.protocol,
        hostname: backend.hostname,
        port: backend.port || (backend.protocol === 'https:' ? 443 : 80),
        method: req.method,
        path: req.url,
        headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
        proxyRes.pipe(res)
      },
    )

    proxyReq.on('error', (err) => {
      if (res.headersSent) {
        res.destroy()
        return
      }
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`Bad Gateway: 无法连接后端 ${backendBaseUrl}（${err.message}）`)
    })

    req.pipe(proxyReq)
  }
}
