import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import './index.css'

// Chỉ bản build (pnpm build → pnpm start): service worker cho phép cài MikMaster như app.
// Không bật khi `pnpm dev` để khỏi bị cache làm lệch code đang sửa.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js') })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
