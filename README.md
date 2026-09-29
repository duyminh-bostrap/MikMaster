# MikMaster

Web app desktop điều khiển và quản lý nhiều máy chiếu AV. Phân cấp: **Project → Booth → Projector**.

Stack: React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router (hash) · pnpm.

Cần **Node ≥ 22.6** (`node -v`; có `.nvmrc`) và pnpm. Chưa có pnpm: `corepack enable` (kèm Node) hoặc `npm i -g pnpm`.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + build
pnpm test       # Vitest; trong VS Code cài extension Vitest (đã gợi ý sẵn) để chạy/debug từng test
pnpm test:e2e   # Playwright: 6 luồng chính trên Chrome có sẵn
```

Tài liệu: [`docs/features.md`](docs/features.md) (tính năng và mức độ đã kiểm) · [`docs/tasks.md`](docs/tasks.md) (công việc còn lại).

> `AV Projector Control App/` là bản thiết kế gốc (Figma Make), giữ lại để đối chiếu; app thật nằm ở `src/`.

## Cấu trúc `src/`

```
app/          App, router, ProjectGuard
pages/        StartPage · DashboardPage · DetailPage (mỏng, chỉ ghép feature)
features/
  start/      tạo project (tên + booth), quét IP, thêm tay, LOGIN & LAUNCH, mở file
  dashboard/  Sidebar, BoothTabs, ProjectorGrid, menu chuột phải, kéo thả, hộp thoại sửa
  detail/     Network, Account (đăng nhập), Commands (mẫu lệnh), Status, Input, TestPattern, lens/*
  appmenu/    menu logo (New/Open/Recent/Save/Export) + hỏi lưu thay đổi
  ping/       PING (ICMP + cổng TCP)
  gateway/    nhập token gateway
components/   ui/ (Button, Modal, PopupMenu, InlineEdit…) · layout/ · projector/
services/     gateway (HTTP tới server/), projectRepository, projectFile, credentialCache
store/        reducer + actions + DeviceSync (poll) + UnloadGuard
utils/        credentials, document (theo dõi thay đổi), sync, lens, fleet…
```

## Chạy như app (cài từ trình duyệt)

```bash
pnpm start       # build + chạy gateway, mở http://127.0.0.1:8787
```

Mở địa chỉ trên bằng **Chrome hoặc Edge** → biểu tượng **Cài đặt** (⊕) ở thanh địa chỉ, hoặc menu ⋮ → *Cast, save and share* →
*Install page as app*. MikMaster có cửa sổ riêng, icon ở Dock/Taskbar và mở được từ Launchpad/Start menu.
Gateway (`pnpm start`) vẫn phải chạy thì mới điều khiển được máy thật; tắt gateway thì app vẫn mở nhưng ở chế độ SIMULATED.

Chỉ cài được khi mở bằng `localhost`/`127.0.0.1` hoặc HTTPS (quy định của trình duyệt), không cài được qua `http://<IP LAN>`.

## Backend (`server/`)

Trình duyệt không mở được socket TCP, nên `server/` là gateway Node (không thêm dependency) nói chuyện với máy chiếu:
PJLink, **Panasonic NTCONTROL (PT-RQ35K)**, **Christie serial-over-IP (Griffyn)**. Web tự phát hiện gateway:
có thì chạy `LIVE`, không thì `SIMULATED`.

```bash
pnpm server      # http://127.0.0.1:8787 (vite proxy /api)
pnpm sim         # máy giả lập để thử khi chưa có phần cứng (macOS: pnpm sim:mac-alias một lần)
pnpm test:server
```

Bind ra mạng (`HOST=0.0.0.0`) bắt buộc có token: đặt `MIKMASTER_TOKEN=...` hoặc để gateway tự sinh và in ra; mở `http://host:8787/?token=<token>` một lần.

> **Driver chưa được thử trên máy thật.** Tài liệu gốc của Panasonic/Christie không truy cập được lúc viết;
> lệnh dựa trên nguồn thứ cấp (ghi rõ trong đầu file `server/src/drivers/*.ts`). Chỉ bật những lệnh có nguồn dẫn chứng:
> Lens, Test Pattern chưa bật ở chế độ LIVE. Dùng **RAW COMMAND** ở trang Detail để đối chiếu với máy thật.

Project lưu ở `data/` (đổi bằng `MIKMASTER_DATA`, đã gitignore); mật khẩu máy chiếu được mã hoá, khoá ở `data/secret.key` hoặc `MIKMASTER_KEY` (base64, 32 byte) — hãy sao lưu khoá cùng dữ liệu.

## Còn là giả lập ở chế độ SIMULATED

Quét mạng, Lens, Test Pattern và telemetry đều là dữ liệu giả; Ping cần gateway.
