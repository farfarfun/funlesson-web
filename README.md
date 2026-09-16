# funlesson-web

[funlesson](https://github.com/farfarfun/funlesson) 的 Web 界面，面向教师使用：粘贴课程视频链接，
查看和下载生成的大纲、思维导图、PPT、架构图。

## 功能特性

- 输入页：粘贴课程视频链接（B 站等）提交
- 结果页：轮询任务进度，展示大纲树 / 思维导图（[markmap](https://markmap.js.org/)）/
  架构图（[mermaid](https://mermaid.js.org/)）/ 逐字稿，提供 PPT 下载链接

## 快速开始

### 安装

```bash
pnpm install
```

### 运行

先在 `funlesson` 那边起好后端服务（默认 `http://127.0.0.1:8000`），再启动前端：

```bash
pnpm dev
```

后端地址不同的话用环境变量指定：

```bash
FUNLESSON_API_BASE_URL=http://127.0.0.1:8000 pnpm dev
```

### 构建

```bash
pnpm build
```

产物在 `dist/`，生产环境部署时需要一个反向代理把 `/api` 转发到 `funlesson` 后端
（当前版本没有内置反代服务，前端只是静态文件）。

## 变更日志

见 [`CHANGELOG.md`](CHANGELOG.md)。

## 许可证

MIT
