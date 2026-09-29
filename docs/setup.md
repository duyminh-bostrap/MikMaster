# Cài MikMaster trên máy (web app local)

MikMaster gồm hai phần chạy chung một tiến trình trên máy của bạn:

- **Gateway** (`server/`): nói chuyện TCP/UDP/HTTP với máy chiếu — trình duyệt không tự làm được việc này.
- **Giao diện web**: gateway phục vụ luôn tại **http://mikmaster.localhost:8787**.

Máy chạy MikMaster phải cắm cùng mạng với máy chiếu (cùng dải IP, ví dụ `192.168.1.x`).

## 1. Cài một lần

1. **Node.js 22 trở lên.** Kiểm tra: `node -v` → phải ra `v22.x` trở lên.
   - macOS (Homebrew): `brew install node@22`, rồi thêm vào PATH:
     `echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc`
   - Windows / Linux: tải bản LTS ở nodejs.org.
2. **pnpm:** `corepack enable`
3. **Mã nguồn:**
   ```bash
   git clone https://github.com/duyminh-bostrap/MikMaster.git
   cd MikMaster
   pnpm install
   ```

## 2. Chạy

```bash
pnpm start
```

Lệnh này build giao diện, chạy gateway và **tự mở trình duyệt** ở http://mikmaster.localhost:8787.
Chân trang hiện **LIVE · GATEWAY CONNECTED** là đang điều khiển máy thật.

- Lần sau không cần build lại (chỉ khi cập nhật mã nguồn): `pnpm serve`
- Dừng: `Ctrl+C` trong terminal.
- Đã có tiến trình khác dùng cổng 8787: MikMaster báo lỗi và dừng — có thể nó đang chạy sẵn, hoặc đổi cổng: `PORT=8800 pnpm serve`.
- Safari không hiểu `mikmaster.localhost`: dùng http://127.0.0.1:8787 (hoặc Chrome / Edge / Firefox).

## 3. Cài như một app (cửa sổ riêng, icon ở Dock / Taskbar)

Mở http://mikmaster.localhost:8787 bằng **Chrome hoặc Edge** → biểu tượng **Cài đặt** (⊕) ở thanh địa chỉ
(hoặc menu ⋮ → *Cast, save and share* → *Install page as app*).

App đã cài vẫn cần gateway đang chạy (`pnpm serve`) mới điều khiển được máy chiếu; không có gateway thì app mở ở chế độ SIMULATED.

## 4. Dữ liệu

- Project lưu trong thư mục `data/` của mã nguồn (đổi bằng biến `MIKMASTER_DATA`).
- Mật khẩu máy chiếu được mã hoá bằng khoá `data/secret.key` — **sao lưu file này cùng `data/projects/`**; mất khoá thì phải nhập lại mật khẩu.
- Có thể xuất từng project ra file `*.mikmaster.json` (menu logo → Export, ⇧⌘S) để mang sang máy khác. File không chứa mật khẩu.

## 5. Dùng từ máy khác trong mạng (tuỳ chọn)

Mặc định chỉ máy đang chạy MikMaster mở được. Muốn máy khác (tablet, laptop khác) cùng điều khiển:

```bash
HOST=0.0.0.0 pnpm serve
```

Gateway in ra một **token**; trên máy kia mở `http://<IP máy chạy MikMaster>:8787/?token=<token>` một lần (trình duyệt nhớ token).
Qua IP mạng LAN thì không cài được như app (trình duyệt chỉ cho cài với `localhost` hoặc HTTPS).

## 6. Tự chạy khi bật máy (macOS, tuỳ chọn)

```bash
cat > ~/Library/LaunchAgents/com.mikmaster.gateway.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.mikmaster.gateway</string>
  <key>ProgramArguments</key><array>
    <string>$(which node)</string><string>$(pwd)/server/src/index.ts</string>
  </array>
  <key>WorkingDirectory</key><string>$(pwd)</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/mikmaster.log</string>
  <key>StandardErrorPath</key><string>/tmp/mikmaster.log</string>
</dict></plist>
EOF
launchctl load ~/Library/LaunchAgents/com.mikmaster.gateway.plist
```

Chạy lệnh trong thư mục MikMaster, sau `pnpm build`. Gỡ: `launchctl unload ~/Library/LaunchAgents/com.mikmaster.gateway.plist` rồi xoá file `.plist`.

## Khi phát triển

`pnpm dev` (giao diện, http://localhost:5173) + `pnpm server` (gateway) — hoặc F5 trong VS Code, cấu hình **Dev: Gateway + Web**.
