// start/stop/restart/status 生命周期管理（照搬 funflix-web 的 server/lifecycle.js）：
// PID 文件规则、优雅停止不自动 SIGKILL。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { frontendReady, BUILD_HINT } from './static.js'

const STARTUP_GRACE_MS = Number(process.env.FUNLESSON_WEB_STARTUP_GRACE_MS ?? 1000)
const STOP_TIMEOUT_MS = Number(process.env.FUNLESSON_WEB_STOP_TIMEOUT_MS ?? 10000)
const STOP_POLL_MS = 200

const CLI_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'cli.js')

function stateDir() {
  const dir = process.env.FUNLESSON_WEB_STATE_DIR ?? path.join(os.homedir(), '.cache', 'farfarfun', 'funlesson-web', 'run')
  mkdirSync(dir, { recursive: true })
  return dir
}

function pidFile() {
  return path.join(stateDir(), 'funlesson-web.pid')
}

function metaFile() {
  return path.join(stateDir(), 'funlesson-web.meta.json')
}

function logFile() {
  return path.join(stateDir(), 'funlesson-web.log')
}

// 只认纯数字且 >1 的 PID。
function readPid() {
  const file = pidFile()
  if (!existsSync(file)) return null
  const raw = readFileSync(file, 'utf8').trim()
  if (!/^[0-9]+$/.test(raw)) return null
  const pid = Number(raw)
  return pid > 1 ? pid : null
}

function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err.code === 'EPERM'
  }
}

function readMeta() {
  const file = metaFile()
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function writeState(pid, meta) {
  const dir = stateDir()
  const tmpPid = pidFile() + '.tmp'
  writeFileSync(tmpPid, String(pid))
  renameSync(tmpPid, pidFile())
  const tmpMeta = metaFile() + '.tmp'
  writeFileSync(tmpMeta, JSON.stringify(meta, null, 2))
  renameSync(tmpMeta, metaFile())
  void dir
}

function clearState() {
  rmSync(pidFile(), { force: true })
  rmSync(metaFile(), { force: true })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function tailLog(lines = 20) {
  const file = logFile()
  if (!existsSync(file)) return ''
  const content = readFileSync(file, 'utf8').split('\n')
  return content.slice(-lines - 1).join('\n')
}

export async function start(opts = {}) {
  const host = opts.host ?? '127.0.0.1'
  const port = opts.port ?? 8812
  const backendBaseUrl = opts.backendBaseUrl ?? process.env.FUNLESSON_API_BASE_URL ?? 'http://127.0.0.1:18812'
  const staticDir = opts.staticDir

  const existingPid = readPid()
  if (existingPid && isAlive(existingPid)) {
    throw new Error(`已在运行（PID ${existingPid}）。先执行 stop，或改用 restart。`)
  }
  if (existingPid) {
    // 陈旧的 PID 文件：进程已不在，清掉再继续。
    clearState()
  }

  const ready = await frontendReady(staticDir ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'))
  if (!ready) {
    throw new Error(BUILD_HINT)
  }

  const args = ['server', 'run', '--host', host, '--port', String(port), '--backend', backendBaseUrl]
  if (staticDir) args.push('--static-dir', staticDir)

  const logFd = openSync(logFile(), 'a')
  const child = spawn(process.execPath, [CLI_PATH, ...args], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
  })
  child.unref()

  writeState(child.pid, {
    pid: child.pid,
    host,
    port,
    backendBaseUrl,
    startedAt: opts.now ?? new Date().toISOString(),
  })

  await sleep(STARTUP_GRACE_MS)

  if (!isAlive(child.pid)) {
    clearState()
    throw new Error(`启动失败，进程未存活。最近日志：\n${tailLog(20)}`)
  }

  return { pid: child.pid, host, port, backendBaseUrl, logFile: logFile() }
}

export async function stop() {
  const pid = readPid()
  if (!pid || !isAlive(pid)) {
    clearState()
    return { stopped: false, message: '未在运行' }
  }

  process.kill(pid, 'SIGTERM')

  const deadline = Date.now() + STOP_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (!isAlive(pid)) {
      clearState()
      return { stopped: true, message: `已停止（PID ${pid}）` }
    }
    await sleep(STOP_POLL_MS)
  }

  // 超时不自动 SIGKILL：强杀是调用方的策略决定，脚本不代为决定。
  throw new Error(`停止超时（${STOP_TIMEOUT_MS}ms），PID ${pid} 仍存活。如需强制终止，请自行 kill -9 ${pid}。`)
}

export async function restart(opts = {}) {
  try {
    await stop()
  } catch (err) {
    throw new Error(`restart 中断：停止旧进程失败 —— ${err.message}`)
  }
  return start(opts)
}

export function status() {
  const pid = readPid()
  const meta = readMeta()

  if (pid && isAlive(pid)) {
    return {
      state: 'running',
      pid,
      host: meta?.host,
      port: meta?.port,
      backendBaseUrl: meta?.backendBaseUrl,
      logFile: logFile(),
    }
  }

  if (pid) {
    return { state: 'stale', pid, message: 'PID 文件存在但进程已不在，下次 start 会自动清理', logFile: logFile() }
  }

  if (meta) {
    return { state: 'stopped', port: meta.port, backendBaseUrl: meta.backendBaseUrl, logFile: logFile() }
  }

  return { state: 'stopped', logFile: logFile() }
}
