import { defineConfig, devices } from '@playwright/test'

// Chạy ở chế độ SIMULATED (không proxy tới gateway) để kết quả không phụ thuộc máy chiếu hay gateway đang chạy.
// Máy có Google Chrome thì dùng luôn; CI cài Chromium của Playwright (xem .github/workflows/ci.yml).
const useSystemChrome = !process.env.CI

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    ...(useSystemChrome ? { channel: 'chrome' } : {}),
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], ...(useSystemChrome ? { channel: 'chrome' } : {}) } }],
  webServer: {
    command: 'pnpm exec vite --port 5174 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5174',
    env: { MIKMASTER_NO_GATEWAY: '1' },
    reuseExistingServer: !process.env.CI,
  },
})
