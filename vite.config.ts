import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8')) as { version: string }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  // App chạy từ máy cục bộ (gateway / file đóng gói) nên một bundle ~500 kB không đáng lo; tránh cảnh báo thừa.
  build: { chunkSizeWarningLimit: 800 },
  server: {
    port: 5173,
    // `pnpm server` chạy gateway ở 8787; nếu không chạy, app tự dùng chế độ mô phỏng.
    // MIKMASTER_NO_GATEWAY=1 (test e2e): không proxy → app luôn ở chế độ SIMULATED.
    // MIKMASTER_GATEWAY: gateway ở cổng khác (ví dụ khi MikMaster.app đang chiếm 8787).
    proxy: process.env.MIKMASTER_NO_GATEWAY ? undefined : { '/api': process.env.MIKMASTER_GATEWAY ?? 'http://127.0.0.1:8787' },
  },
})
