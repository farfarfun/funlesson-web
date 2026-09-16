# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/) 格式。

## [未发布]

### Changed

- 开发态端口改为 `8812`，默认后端地址改为 `http://127.0.0.1:18812`
- 新增内置反代服务（`server/`、`bin/cli.js`，逻辑照搬 funflix-web）：生产环境
  用 `funlesson-web server start` 一条命令同时托管静态文件和反代 `/api`，
  支持 start/stop/restart/status

## [0.1.0] - 2026-09-16

### Added

- 输入页：粘贴课程视频链接提交
- 结果页：轮询任务状态，展示大纲（树形）、思维导图（markmap 渲染）、
  架构图（mermaid 渲染）、逐字稿，提供 PPT 下载
- 开发态通过 vite dev server 代理 `/api` 到本地 `funlesson` 后端
