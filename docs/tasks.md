# MikMaster — Danh sách công việc

Cập nhật: 2026-09-29. Ký hiệu: ✅ xong · 🧪 xong nhưng chưa thử máy thật · ⬜ chưa làm.

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
| C4 | Telemetry cho Panasonic/Christie: nhiệt độ, giờ laser, mã lỗi | Trung bình | Cần tên lệnh truy vấn từ tài liệu; hiện hiển thị `—` |
| C5 | Driver TCP chung, UDP, Art-Net, HTTP API | Trung bình | Hiện chọn được trong UI nhưng trả `501` |
| C6 | Xác thực token cho gateway; `HOST` ngoài loopback tự sinh token nếu chưa đặt `MIKMASTER_TOKEN` | ✅ | Bearer hoặc `?token=` (web lưu vào localStorage). Sai/thiếu token → web rơi về SIMULATED, chưa có màn hình nhập token |
| C7 | Lưu project phía server (thay `localStorage`); mã hoá/không lưu mật khẩu máy chiếu dạng thường | Trung bình | |
| C8 | Đóng gói desktop (Tauri/Electron) chạy kèm gateway | Thấp | Trình duyệt không mở được socket TCP nên gateway là bắt buộc |
| C9 | Đưa test frontend vào repo (Vitest cho reducer/`applyRemote`, Playwright cho luồng chính) và CI | Thấp | |
| C10 | Thử nhiều màn hình / độ phân giải nhỏ hơn 1440×900 | Thấp | Mới chụp ở 1440×900 |

## Cách chạy

```bash
pnpm install
pnpm dev            # web, chế độ SIMULATED
pnpm server         # gateway :8787 → web chuyển sang LIVE
pnpm sim            # 3 máy giả lập trên 127.0.0.21/22/23 để thử quét subnet 127.0.0
pnpm test:server    # test driver + API
pnpm typecheck
```
