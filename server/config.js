// 配置文件解析：`--config` 按扩展名选择解析器（.json / .toml / .env）。
// 只覆盖本 CLI 用得到的四个扁平字段（host/port/backend/staticDir），
// 不是通用 TOML/dotenv 实现——不支持 [section]、数组、内联表。
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function defaultConfigPath() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(configHome, 'farfarfun', 'funlesson-web', 'config.toml')
}

function pick(raw) {
  const out = {}
  if (raw.host !== undefined) out.host = String(raw.host)
  if (raw.port !== undefined) out.port = Number(raw.port)
  if (raw.backend !== undefined) out.backend = String(raw.backend)
  const staticDir = raw.static_dir ?? raw.staticDir
  if (staticDir !== undefined) out.staticDir = String(staticDir)
  return out
}

function parseJson(text) {
  return pick(JSON.parse(text))
}

// KEY=value 一行一条，兼容 FUNLESSON_WEB_* / FUNLESSON_API_BASE_URL 环境变量命名。
function parseEnv(text) {
  const raw = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    raw[key] = value
  }
  return pick({
    host: raw.FUNLESSON_WEB_HOST,
    port: raw.FUNLESSON_WEB_PORT,
    backend: raw.FUNLESSON_API_BASE_URL,
    static_dir: raw.FUNLESSON_WEB_STATIC_DIR,
  })
}

function parseToml(text) {
  const raw = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) {
      value = value.slice(1, -1)
    } else if (/^-?\d+$/.test(value)) {
      value = Number(value)
    }
    raw[key] = value
  }
  return pick(raw)
}

// explicit=true（用户传了 --config）时缺文件是错误；用默认路径时缺文件只是「没配置」。
export function loadConfig(configPath, explicit) {
  if (!existsSync(configPath)) {
    if (explicit) throw new Error(`配置文件不存在：${configPath}`)
    return {}
  }
  const text = readFileSync(configPath, 'utf8')
  const ext = path.extname(configPath).toLowerCase()
  switch (ext) {
    case '.json':
      return parseJson(text)
    case '.env':
      return parseEnv(text)
    case '.toml':
      return parseToml(text)
    default:
      throw new Error(`不支持的配置文件类型：${configPath}（只支持 .json / .toml / .env）`)
  }
}
