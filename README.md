# MikMaster

Web app desktop điều khiển và quản lý nhiều máy chiếu AV. Phân cấp: **Project → Booth → Projector**.

Stack: React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router (hash) · pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + build
```

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

## Còn là giả lập

Chưa có backend điều khiển thật: quét mạng (`useNetworkScan`), phím OSD (`OsdPanel`),
Reconnect (`DeviceStatus`) và telemetry đều là mô phỏng — đó là các điểm để nối driver giao thức.
