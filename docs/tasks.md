# MikMaster — Danh sách công việc

Cập nhật: 2026-09-29 (khuya, sau khi kiểm máy thật). Ký hiệu: ✅ xong · 🧪 xong nhưng chưa thử máy thật · ⬜ chưa làm.

## A. Frontend (đã hoàn thành)

| # | Công việc | Trạng thái |
|---|---|---|
| A1 | Phân tích thiết kế Figma Make, bóc tách component dùng lại | ✅ |
| A2 | Cấu trúc `src/`: `app pages features components types constants store services hooks utils data` | ✅ |
| A3 | Data schema: `Project`, `Booth`, `Projector`, `LensPreset`, `ProtocolType`, `TestPattern`, kết nối + log | ✅ |
| A4 | Layout multi-panel Desktop (Dashboard, Detail), Tailwind v4, dark theme | ✅ |
| A5 | Mock data + điều hướng Dashboard ⇄ Detail (React Router hash) | ✅ |
| A6 | Test tự động qua trình duyệt (luồng mô phỏng) | ✅ 24/24 (script Playwright, chưa nằm trong repo) |

## B. Backend gateway (`server/`)

| # | Công việc | Trạng thái |
|---|---|---|
| B1 | Khung TCP: tách khung theo CR / dấu ngoặc, timeout, hàng đợi tuần tự mỗi máy | ✅ |
| B2 | Driver PJLink Class 1/2 (MD5) | 🧪 |
| B3 | Driver Panasonic NTCONTROL cho PT-RQ35K | 🧪 |
| B4 | Driver Christie serial-over-IP cho Griffyn | 🧪 |
| B5 | HTTP API: `health`, `scan` (SSE), `status`, `command`, `raw` | ✅ |
| B6 | Chặn SSRF (chỉ IPv4 nội bộ), giới hạn kích thước body | ✅ |
| B7 | Bộ giả lập PJLink / Panasonic / Christie (`pnpm sim`) | ✅ |
| B8 | 34 test tích hợp qua TCP thật (`pnpm test:server`) | ✅ |
| B9 | Web tự phát hiện gateway; lệnh lạc quan + báo lỗi; poll trạng thái; quét mạng thật | ✅ |
| B10 | Khoá tính năng chưa có lệnh xác minh (Lens, Test Pattern, Input Christie, OSD Back/Exit) | ✅ |

## C. Việc còn lại

| # | Công việc | Ưu tiên | Ghi chú |
|---|---|---|---|
| C1 | **Kiểm trên PT-RQ35K thật**: banner/xác thực, `PON` `POF` `QPW` `OSH` `QSH` `IIS` `QIN`, phím OSD. Dùng Raw Command để đối chiếu | Cao | Driver viết theo ghi chú giao thức thứ cấp, chưa đối chiếu PDF gốc |
| C2 | **Kiểm trên Griffyn thật**: ý nghĩa mã trả về của `(PWR?)`, chiều của `(SHU0/1)`, định dạng lỗi | Cao | Chưa tìm được tài liệu riêng của Griffyn; hiện dựa vào tài liệu dòng M |
| C3 | **Có tài liệu chính thức** (Panasonic PT-RQ35K command list + Christie Griffyn serial API) rồi làm: Lens Shift/Zoom/Focus, Lens Memory, Test Pattern, OSD Back/Exit, Input Christie | Cao | Chặn bởi C1/C2 và tài liệu; không gửi lệnh đoán vào động cơ ống kính |
| C4 | Telemetry: Christie nhiệt độ (SST+TEMP) + giờ laser (SST+LGHT) + input ✅ trên Griffyn thật; RQ35K giờ đèn qua PJLink ✅ | Trung bình | Còn: nhiệt độ RQ35K (cần NTCONTROL / web, có đăng nhập), lỗi Christie (SST+ALRM) |
| C5 | Driver TCP chung, UDP, Art-Net, HTTP API | ✅ | RAW COMMAND + mẫu lệnh Power / Shutter khai báo ở trang Detail (mục COMMANDS). Không poll, không quét mạng |
| C6 | Xác thực token cho gateway; `HOST` ngoài loopback tự sinh token nếu chưa đặt `MIKMASTER_TOKEN` | ✅ | Bearer hoặc `?token=` (web lưu vào localStorage). Thiếu/sai token → huy hiệu GATEWAY LOCKED + ô nhập token |
| C7 | Lưu project phía server (`data/projects/*.json`); mật khẩu máy chiếu mã hoá AES-256-GCM (khoá `MIKMASTER_KEY` hoặc `data/secret.key`) | ✅ | API `GET/PUT/DELETE /api/projects[/id]`, ghi nguyên tử, file quyền 0600. Không có gateway thì dùng localStorage nhưng bỏ mật khẩu. Có xoá project, lưu/mở file. Mất khoá thì phải nhập lại mật khẩu |
| C8 | Đóng gói: `MikMaster-Setup.exe` + `MikMaster.exe` (Windows) / `MikMaster.dmg` → MikMaster.app (macOS) — Node SEA, gateway + giao diện nhúng sẵn | ✅ | `pnpm build:exe` hoặc GitHub Actions *Build executables*. Chưa ký số (SmartScreen / Gatekeeper cảnh báo lần đầu); bản .exe chưa chạy thử trên máy Windows thật |
| C9 | Vitest (73) + test gateway (77) + Playwright e2e (6 luồng chính) + CI GitHub Actions | ✅ | `pnpm test`, `pnpm test:server`, `pnpm test:e2e` |
| C10 | Thử độ phân giải nhỏ hơn 1440×900 | ✅ | Đã kiểm 1024×700 và 800×600 (Start, Wizard, Dashboard, Detail): không tràn ngang; Detail xếp dọc dưới 1024. Đã sửa vạch chia lẻ loi ở FleetMetrics khi hàng xuống dòng. Chưa kiểm màn hình > 1440 và chưa đo bằng thiết bị thật |
| C11 | Nhận diện theo IP chọn PJLink cho Panasonic (hãng khuyên dùng) / khi cổng hãng cần đăng nhập | ✅ | Kiểm trên RQ35K thật (NTCONTROL 1, PJLink không mật khẩu) |
| C12 | **Live preview** Griffyn: ảnh thu nhỏ tín hiệu vào qua JSON-RPC web (`video:getInputInfo`) | 🧪 | Đã làm (gateway `POST /api/devices/preview`, trang máy hiện ảnh mỗi giây). Cần tài khoản web của máy; người dùng tự kiểm trên máy thật. RQ35K: chưa tìm thấy |
| C17 | Mục LỆNH gom vào nút **Nâng cao** (đóng mặc định) | ✅ | |
| C13 | **Test pattern** Griffyn: mã `ITP` (đọc được "Off"); cần danh sách giá trị, bật thử phải được đồng ý | Cao | RQ35K: không có qua PJLink |
| C14 | Độ sáng laser | Trung bình | Griffyn không có LPP/LOP/BRT; RQ35K không có qua PJLink. Cần tài liệu hãng |
| C15 | Đổi input Christie (ghi) | Trung bình | Cần bảng số `SIN` / `CHA` theo cấu hình cổng |
| C16 | Lens Griffyn: **đọc vị trí** `LHO` `LVO` `ZOM` `FCS` ✅ trên máy thật. Di chuyển (`LHO n`… / `LMV+*`) và preset (app tự lưu vị trí) | Trung bình | Chưa gửi lệnh di chuyển; thử khi người dùng đứng cạnh máy và đồng ý từng lệnh. Chưa tìm thấy lệnh lens memory của máy |
| C18 | **License phần mềm** (khoá ký số, dùng thử 30 ngày, giới hạn số máy) | ✅ | Chính sách mặc định (30 ngày / 3 máy khi hết hạn) chỉnh ở `server/src/license.ts` |

## Cách chạy

```bash
pnpm install
pnpm dev            # web, chế độ SIMULATED
pnpm run server         # gateway :8787 → web chuyển sang LIVE
pnpm sim            # 3 máy giả lập trên 127.0.0.21/22/23 (macOS: chạy `pnpm sim:mac-alias` một lần, cần mật khẩu)
pnpm test           # Vitest (frontend)
pnpm test:watch
pnpm test:server    # test driver + API
pnpm test:e2e       # Playwright (dùng Chrome có sẵn trên máy)
pnpm typecheck
```
