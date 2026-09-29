# MikMaster

Web app desktop điều khiển và quản lý nhiều máy chiếu AV. Phân cấp: **Project → Booth → Projector**.

Stack: React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router (hash) · pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + build
pnpm test       # Vitest; trong VS Code cài extension Vitest (đã gợi ý sẵn) để chạy/debug từng test
```

Tài liệu: [`docs/features.md`](docs/features.md) (tính năng và mức độ đã kiểm) · [`docs/tasks.md`](docs/tasks.md) (công việc còn lại).

> `AV Projector Control App/` là bản thiết kế gốc (Figma Make), giữ lại để đối chiếu; app thật nằm ở `src/`.

## Cấu trúc `src/`

```
app/          App, router, ProjectGuard
pages/        StartPage · DashboardPage · DetailPage (mỏng, chỉ ghép feature)
features/
  start/      tạo/tải project, quét IP, thêm tay, phân bổ Booth + Protocol
  dashboard/  Sidebar, TopBar, FleetMetrics, QuickControls, BoothTabs, ProjectorGrid
  detail/     NetworkEditor, BasicControls, DeviceStatus (+log), OSD, TestPattern, lens/*
components/
  ui/         Button, Badge, Panel, Field, DirectionPad ...
  layout/     AppShell, AppLogo, AppFooter
  projector/  ProjectorCard, PreviewScreen, TestPatternOverlay (dùng chung Dashboard + Detail)
types/        Project, Booth, Projector, LensPreset, Protocol, TestPattern, Osd
constants/    protocols, inputs, testPatterns, lens
store/        reducer + context (state / actions tách riêng)
services/     projectRepository (localStorage; điểm nối backend)
hooks/        useClock, useBoothFilter (lọc Booth trên URL)
utils/        cn, format, tones, network, lens, projector, fleet
data/         mock data
```

## Backend (`server/`)

Trình duyệt không mở được socket TCP, nên `server/` là gateway Node (không thêm dependency) nói chuyện với máy chiếu:
PJLink, **Panasonic NTCONTROL (PT-RQ35K)**, **Christie serial-over-IP (Griffyn)**. Web tự phát hiện gateway:
có thì chạy `LIVE`, không thì `SIMULATED`.

```bash
pnpm server      # http://127.0.0.1:8787 (vite proxy /api)
pnpm sim         # máy giả lập để thử khi chưa có phần cứng
pnpm test:server
```

Bind ra mạng (`HOST=0.0.0.0`) bắt buộc có token: đặt `MIKMASTER_TOKEN=...` hoặc để gateway tự sinh và in ra; mở `http://host:8787/?token=<token>` một lần.

> **Driver chưa được thử trên máy thật.** Tài liệu gốc của Panasonic/Christie không truy cập được lúc viết;
> lệnh dựa trên nguồn thứ cấp (ghi rõ trong đầu file `server/src/drivers/*.ts`). Chỉ bật những lệnh có nguồn dẫn chứng:
> Lens, Test Pattern chưa bật ở chế độ LIVE. Dùng **RAW COMMAND** ở trang Detail để đối chiếu với máy thật.

## Còn là giả lập ở chế độ SIMULATED

Quét mạng, phím OSD, Reconnect, Lens, Test Pattern và telemetry đều là dữ liệu giả.
