import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    // `pnpm server` chạy gateway ở 8787; nếu không chạy, app tự dùng chế độ mô phỏng.
    // MIKMASTER_NO_GATEWAY=1 (test e2e): không proxy → app luôn ở chế độ SIMULATED.
    proxy: process.env.MIKMASTER_NO_GATEWAY ? undefined : { '/api': 'http://127.0.0.1:8787' },
  },
})
