import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { defineConfig } from 'vite'

// 开发态后端地址，默认对应 `uvicorn funlesson.main:app --port 8000`
const BACKEND = process.env.FUNLESSON_API_BASE_URL || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [
    vue(),
    // 按需解析模板里用到的 n-* 组件，避免把整个 naive-ui 打进主包
    Components({ resolvers: [NaiveUiResolver()], dts: 'components.d.ts' }),
  ],

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  server: {
    port: 5173,
    // 开发态用 vite 的 HMR，接口转发给真实后端，避免跨域
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
    },
  },
})
