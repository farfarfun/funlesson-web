# funlesson-web

[funlesson](https://github.com/farfarfun/funlesson) 的 Web 界面，面向教师使用：粘贴课程视频链接，
查看和下载生成的大纲、思维导图、PPT、架构图。

## 功能特性

- 输入页：粘贴课程视频链接（B 站等）提交
- 结果页：轮询任务进度，展示大纲树 / 思维导图（[markmap](https://markmap.js.org/)）/
  架构图（[mermaid](https://mermaid.js.org/)）/ 逐字稿，提供 PPT 下载链接
- 内置反代服务：静态托管 `dist/` 产物 + 把 `/api` 转发到 `funlesson` 后端，
  浏览器眼里只有一个源，避免生产环境的跨域/访问问题（逻辑照搬
  [funflix-web](https://github.com/farfarfun/funflix-web)）

## 快速开始（开发）

### 安装

```bash
pnpm install
```

### 运行

先在 `funlesson` 那边起好后端服务（默认 `http://127.0.0.1:18812`），再启动前端：

```bash
pnpm dev
```

开发态通过 vite dev server 把 `/api` 代理到后端，前端监听 `8812` 端口。
后端地址不同的话用环境变量指定：

```bash
FUNLESSON_API_BASE_URL=http://127.0.0.1:18812 pnpm dev
```

## 生产部署

```bash
pnpm build
```

产物在 `dist/`，之后用内置 CLI 启动一个静态托管 + 反代服务，默认监听 `8812`，
反代到 `18812` 的后端：

```bash
node bin/cli.js server start
# 或者全局安装后
funlesson-web server start
```

`server` 子命令支持 `start` / `stop` / `restart` / `status` / `run`（前台运行）：

```bash
funlesson-web server start --host 0.0.0.0 --port 8812 --backend http://127.0.0.1:18812
funlesson-web server status
funlesson-web server stop
```

也可以用环境变量或配置文件（`~/.config/farfarfun/funlesson-web/config.toml`，支持
`.json`/`.toml`/`.env`）设置 `host`/`port`/`backend`/`static_dir`，具体字段名见
`server/config.js`。PID、日志默认写到 `~/.cache/farfarfun/funlesson-web/run/`。

## 变更日志

见 [`CHANGELOG.md`](CHANGELOG.md)。

## 许可证

MIT
