# Cài MikMaster trên máy (web app local)

MikMaster gồm hai phần chạy chung một tiến trình trên máy của bạn:

- **Gateway** (`server/`): nói chuyện TCP/UDP/HTTP với máy chiếu — trình duyệt không tự làm được việc này.
- **Giao diện web**: gateway phục vụ luôn tại **http://mikmaster.localhost:8787**.

Máy chạy MikMaster phải cắm cùng mạng với máy chiếu (cùng dải IP, ví dụ `192.168.1.x`).

## Cách nhanh nhất: file chạy sẵn (không cần cài gì)

Tải ở mục **Releases** trên GitHub:

| Máy | File |
|---|---|
| Windows | **MikMaster-Setup.exe** (bộ cài, nên dùng) — hoặc **MikMaster.exe** (chạy ngay, không cài) |
| Mac (Apple Silicon) | **MikMaster.dmg** |

Không máy nào cần cài Node hay tải thêm gì: app đã chứa sẵn mọi thứ, cài được khi không có mạng.

### Windows

1. Chạy **MikMaster-Setup.exe** → *Next* → *Install*. Không cần quyền admin; cài vào `%LOCALAPPDATA%\Programs\MikMaster`, tạo shortcut ở Start menu (Desktop: tuỳ chọn) và mở MikMaster khi cài xong.
2. Lần đầu: SmartScreen báo "Windows protected your PC" (bộ cài chưa ký số) → *More info* → *Run anyway*.
3. MikMaster mở một cửa sổ đen hiện địa chỉ và mở trình duyệt. Giữ cửa sổ đó trong lúc dùng; đóng nó hoặc menu logo → **Quit MikMaster** là tắt.
4. Cập nhật: chạy bộ cài bản mới (tự tắt MikMaster đang chạy). Gỡ: *Settings → Apps → MikMaster → Uninstall*.
5. Dữ liệu: `%APPDATA%\MikMaster` — giữ nguyên khi cập nhật hoặc gỡ (xoá tay thư mục này nếu muốn xoá hết).

Không muốn cài: dùng **MikMaster.exe**, chép đi đâu cũng chạy được (bấm đúp).

### Mac

1. Mở `MikMaster.dmg`, kéo **MikMaster** vào **Applications**.
2. Mở MikMaster từ Applications / Launchpad. App chạy nền (không có cửa sổ riêng) và tự mở trình duyệt.
3. Lần đầu (app chưa được Apple công chứng): macOS báo không mở được → **System Settings → Privacy & Security** → *Open Anyway* (macOS 14 trở về trước: chuột phải vào app → *Open*).
   macOS hỏi quyền **Local Network** → **Allow**, nếu không MikMaster không thấy máy chiếu.
4. Tắt: menu logo (góc trên trái trong trình duyệt) → **Quit MikMaster**. Log: `~/Library/Logs/MikMaster.log`. Dữ liệu: `~/Library/Application Support/MikMaster`.

Cả hai: mở lại app khi đang chạy thì không chạy bản thứ hai, chỉ mở lại trình duyệt. Thay bản mới không mất dữ liệu.

Tự build file chạy: `pnpm build:exe` → `release/` (build cho hệ điều hành đang dùng; cần Node **chính thức** từ nodejs.org — bản Homebrew không đóng gói được, hoặc chỉ định `node scripts/build-exe.mjs --node /đường/dẫn/node`).

## Chạy từ mã nguồn

### 1. Cài một lần

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

### 2. Chạy

```bash
pnpm start
```

Lệnh này build giao diện, chạy gateway và **tự mở trình duyệt** ở http://mikmaster.localhost:8787.
Chân trang hiện **LIVE · GATEWAY CONNECTED** là đang điều khiển máy thật.

- Lần sau không cần build lại (chỉ khi cập nhật mã nguồn): `pnpm serve`
- Dừng: `Ctrl+C` trong terminal.
- Đã có tiến trình khác dùng cổng 8787: MikMaster báo lỗi và dừng — có thể nó đang chạy sẵn, hoặc đổi cổng: `PORT=8800 pnpm serve`.
- Safari không hiểu `mikmaster.localhost`: dùng http://127.0.0.1:8787 (hoặc Chrome / Edge / Firefox).

## Cài như một app (cửa sổ riêng, icon ở Dock / Taskbar)

Mở http://mikmaster.localhost:8787 bằng **Chrome hoặc Edge** → biểu tượng **Cài đặt** (⊕) ở thanh địa chỉ
(hoặc menu ⋮ → *Cast, save and share* → *Install page as app*).

App đã cài vẫn cần gateway đang chạy (`pnpm serve`) mới điều khiển được máy chiếu; không có gateway thì app mở ở chế độ SIMULATED.

## Dữ liệu

- Chạy từ mã nguồn: project lưu trong thư mục `data/` (đổi bằng biến `MIKMASTER_DATA`). File chạy sẵn: thư mục ứng dụng ở trên.
- Mật khẩu máy chiếu được mã hoá bằng khoá `data/secret.key` — **sao lưu file này cùng `data/projects/`**; mất khoá thì phải nhập lại mật khẩu.
- Có thể xuất từng project ra file `*.mikmaster.json` (menu logo → Export, ⇧⌘S) để mang sang máy khác. File không chứa mật khẩu.

## Dùng từ máy khác trong mạng (tuỳ chọn)

Mặc định chỉ máy đang chạy MikMaster mở được. Muốn máy khác (tablet, laptop khác) cùng điều khiển:

```bash
HOST=0.0.0.0 pnpm serve        # file chạy sẵn trên Windows (cmd): set "HOST=0.0.0.0" && MikMaster.exe
```

Gateway in ra một **token**; trên máy kia mở `http://<IP máy chạy MikMaster>:8787/?token=<token>` một lần (trình duyệt nhớ token).
Qua IP mạng LAN thì không cài được như app (trình duyệt chỉ cho cài với `localhost` hoặc HTTPS).

## Tự chạy khi bật máy (macOS, tuỳ chọn)

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

`pnpm dev` (giao diện, http://localhost:5173) + `pnpm run server` (gateway) — hoặc F5 trong VS Code, cấu hình **Dev: Gateway + Web**.
