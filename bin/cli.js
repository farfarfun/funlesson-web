#!/usr/bin/env node
// funlesson-web CLI。
//
// 子命令分两组（照搬 funflix-web 的 bin/cli.js）：
//   server <start|stop|restart|status|run>   运行时生命周期
//   upgrade / rollback / uninstall            CLI 自身的包管理（走 npm）
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runServe } from '../server/app.js'
import { start, stop, restart, status } from '../server/lifecycle.js'
import { defaultConfigPath, loadConfig } from '../server/config.js'

const PKG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PKG = JSON.parse(readFileSync(path.join(PKG_DIR, 'package.json'), 'utf8'))

const USAGE = `用法：funlesson-web <命令> [选项]

运行时（server 组）：
  funlesson-web server start    [选项]   后台运行，PID/日志见 ~/.cache/farfarfun/funlesson-web/run/
  funlesson-web server stop              停止后台进程（SIGTERM，等待超时不会自动强杀）
  funlesson-web server restart  [选项]   stop + start
  funlesson-web server status            查看运行状态与版本
  funlesson-web server run      [选项]   前台运行，Ctrl-C 停止

包自身管理：
  funlesson-web upgrade [版本号]   安装最新版或指定版本（npm install -g）
  funlesson-web rollback <版本号>  回退到指定的旧版本
  funlesson-web uninstall          先停止正在运行的 server，再卸载

选项（server start/restart/run 均支持）：
  --config <path>     配置文件（.json/.toml/.env），默认 ${defaultConfigPath()}
  --host <host>        监听地址，默认 127.0.0.1
  --port <port>        监听端口，默认 8812
  --backend <url>      后端地址，默认配置文件 backend 或 $FUNLESSON_API_BASE_URL 或 http://127.0.0.1:18812
  --static-dir <dir>   前端产物目录，默认包内 dist/

显式 flag 会覆盖配置文件里的同名字段；配置文件缺省字段则使用命令内置默认值。`

function parseOptionArgs(argv) {
  const opts = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    switch (arg) {
      case '--config':
        opts.config = argv[++i]
        break
      case '--host':
        opts.host = argv[++i]
        break
      case '--port':
        opts.port = Number(argv[++i])
        break
      case '--backend':
        opts.backendBaseUrl = argv[++i]
        break
      case '--static-dir':
        opts.staticDir = argv[++i]
        break
      default:
        throw new Error(`未知参数：${arg}`)
    }
  }
  return opts
}

// 配置文件字段 -> resolve() 用的字段名；CLI flag 已经用的是后者，这里做个映射。
function resolveOpts(cliOpts) {
  const configPath = cliOpts.config ?? defaultConfigPath()
  const fileConfig = loadConfig(configPath, Boolean(cliOpts.config))

  return {
    host: cliOpts.host ?? fileConfig.host,
    port: cliOpts.port ?? fileConfig.port,
    backendBaseUrl: cliOpts.backendBaseUrl ?? fileConfig.backend,
    staticDir: cliOpts.staticDir ?? fileConfig.staticDir,
  }
}

function npmGlobal(args) {
  const result = spawnSync('npm', args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(' ')} 失败（exit ${result.status}）`)
  }
}

async function runServerCommand(command, rest) {
  const opts = resolveOpts(parseOptionArgs(rest))

  switch (command) {
    case 'run':
      await runServe(opts)
      break
    case 'start': {
      const result = await start(opts)
      console.log(`已启动（PID ${result.pid}）：http://${result.host}:${result.port}`)
      console.log(`后端：${result.backendBaseUrl}`)
      console.log(`日志：${result.logFile}`)
      break
    }
    case 'stop': {
      const result = await stop()
      console.log(result.message)
      break
    }
    case 'restart': {
      const result = await restart(opts)
      console.log(`已重启（PID ${result.pid}）：http://${result.host}:${result.port}`)
      break
    }
    case 'status': {
      const result = status()
      if (result.state === 'running') {
        console.log(`运行中（${PKG.name}@${PKG.version}）：PID ${result.pid}，http://${result.host}:${result.port}，后端 ${result.backendBaseUrl}`)
      } else if (result.state === 'stale') {
        console.log(`陈旧 PID 文件（PID ${result.pid} 已不存在）：${result.message}`)
      } else if (result.port) {
        console.log(`已停止（${PKG.name}@${PKG.version}，上次监听端口 ${result.port}，后端 ${result.backendBaseUrl}）`)
      } else {
        console.log(`已停止（${PKG.name}@${PKG.version}）`)
      }
      console.log(`日志：${result.logFile}`)
      break
    }
    default:
      throw new Error(`未知的 server 子命令：${command}`)
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)

  if (!command || command === '-h' || command === '--help') {
    console.log(USAGE)
    process.exit(command ? 0 : 1)
  }

  try {
    switch (command) {
      case 'server': {
        const [subCommand, ...subRest] = rest
        if (!subCommand) throw new Error('server 需要一个子命令：start|stop|restart|status|run')
        await runServerCommand(subCommand, subRest)
        break
      }
      case 'upgrade': {
        const version = rest[0]
        const target = version ? `${PKG.name}@${version}` : `${PKG.name}@latest`
        console.log(`安装 ${target} ...`)
        npmGlobal(['install', '-g', target])
        break
      }
      case 'rollback': {
        const version = rest[0]
        if (!version) throw new Error('rollback 需要一个版本号，例如：funlesson-web rollback 0.1.0')
        console.log(`回退到 ${PKG.name}@${version} ...`)
        npmGlobal(['install', '-g', `${PKG.name}@${version}`])
        break
      }
      case 'uninstall': {
        try {
          await stop()
        } catch (err) {
          throw new Error(`卸载中断：停止运行中的 server 失败 —— ${err.message}`)
        }
        console.log(`卸载 ${PKG.name} ...`)
        npmGlobal(['uninstall', '-g', PKG.name])
        break
      }
      default:
        console.error(`未知命令：${command}`)
        console.error(USAGE)
        process.exit(1)
    }
  } catch (err) {
    console.error(`错误：${err.message}`)
    process.exit(1)
  }
}

main()
