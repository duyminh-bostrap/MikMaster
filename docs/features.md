# MikMaster — Danh sách tính năng

Kiến trúc dữ liệu: **Project → Booth → Projector**. Máy chiếu mục tiêu: **Panasonic PT-RQ35K** và **Christie Griffyn 4K32-RGB** (ngoài ra PJLink).

## Cách đọc trạng thái

| Ký hiệu | Nghĩa |
|---|---|
| ✅ | Đã làm và đã kiểm tự động, không phụ thuộc phần cứng |
| 🧪 | Đã làm, **chỉ kiểm với bộ giả lập** viết theo tài liệu; **chưa thử trên máy thật** |
| 🎭 | Chỉ mô phỏng trong UI (dữ liệu giả); không điều khiển thiết bị |
| ⬜ | Chưa làm |

Có hai chế độ chạy, hiển thị ở chân trang (huy hiệu `LIVE` / `SIMULATED`):

- **LIVE** — có gateway (`pnpm server`): lệnh và trạng thái đi tới máy chiếu thật qua TCP.
- **SIMULATED** — không có gateway: toàn bộ dữ liệu là mock, để demo và phát triển UI.

## 1. Project & kết nối mạng

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Tạo Project mới (tên, venue, Booth) | ✅ | Booth thêm/xoá được, tối thiểu 1 |
| Tải lại Project | ✅ | 3 dự án mẫu + dự án đã lưu |
| Lưu Project (IP, thông số, giao thức, Booth, Lens Preset) | ✅ | Lưu vào `localStorage` của trình duyệt (qua `services/projectRepository`) |
| Auto-scan dải IP `/24` | 🧪 | Thật ở chế độ LIVE: thử kết nối cổng PJLink 4352, Panasonic 1024, Christie 3002 trên từng IP. Chỉ nhận dải nội bộ |
| Thêm thủ công qua IP | ✅ | Kiểm IPv4, chặn trùng, có preset model RQ35K / Griffyn, nhập user/password |
| Phân bổ máy vào Booth + chọn Protocol từng máy | ✅ | |
| Giao thức PJLink Class 1/2 | 🧪 | Xác thực MD5, POWR/INPT/AVMT/ERST/LAMP/INF |
| Giao thức Panasonic NTCONTROL (RQ35K) | 🧪 | Banner + MD5/SHA-256 challenge, cổng 1024 |
| Giao thức Christie serial-over-IP (Griffyn) | 🧪 | Khung `(CODE…)`, cổng 3002 |
| Giao thức TCP/IP chung, UDP, Art-Net, HTTP API | ⬜ | Chọn được trong UI nhưng chưa có driver: gateway trả `501`, app chỉ đổi trạng thái cục bộ và ghi cảnh báo vào log |
| Cảnh báo lỗi rớt mạng / sai giao thức / sai mật khẩu | ✅ | Trạng thái kết nối (`CONNECTED` / `DISCONNECTED` / `PROTOCOL ERROR`), Event Log, nút Reconnect; ngừng poll máy bị từ chối xác thực để không làm máy chiếu khoá cổng |

## 2. Dashboard

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Gom nhóm theo Booth, sidebar dạng cây | ✅ | |
| Grid preview toàn bộ / lọc theo Booth | ✅ | Booth đang lọc nằm trên URL |
| Thẻ máy: tên, IP, hãng/giao thức, trạng thái, input, nhiệt độ, lỗi | ✅ | Nhiệt độ hiện `—` nếu thiết bị không báo |
| Quick Controls đồng loạt (bật/tắt, Shutter) theo toàn Project hoặc 1 Booth | 🧪 | Gửi lệnh thật tới từng máy ở chế độ LIVE |
| Chỉ số tổng: Fleet Health, cảnh báo, nhiệt độ TB, giờ đèn | ✅ | Bỏ qua thiết bị không báo nhiệt độ; máy mất liên lạc không tính là online |
| Đọc trạng thái thật định kỳ (4 giây) | 🧪 | Power, Shutter, Input, cảnh báo (PJLink), giờ đèn (PJLink) |

## 3. Trang chi tiết (từng máy)

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Cấu hình mạng: IP, Port, Username/Password, đổi giao thức | ✅ | Nút Apply, kiểm hợp lệ, ghi log |
| Power On / Standby / Off | 🧪 | PJLink không có "off" riêng: máy tắt báo `standby` |
| Shutter / Blank | 🧪 | PJLink `AVMT`, Panasonic `OSH`, Christie `SHU` |
| Chọn Input | 🧪 | PJLink, Panasonic. Christie **chưa** (kênh Christie là preset người dùng, chưa xác minh với Griffyn) |
| Test Pattern (bật/tắt, chọn loại bằng thumbnail, gồm Crosshair) | 🎭 | Ở chế độ LIVE bị khoá: chưa có lệnh xác minh |
| OSD: Menu, Enter, 4 phím hướng | 🧪 | Chỉ Panasonic. `Back` / `Exit` chưa có lệnh xác minh (báo `unsupported`) |
| Raw Command (gửi nguyên văn lệnh của hãng, xem phản hồi thô) | 🧪 | Công cụ để đối chiếu lệnh với máy thật |

## 4. Lens Control & Preset

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Lens Shift (lên/xuống/trái/phải), Zoom, Focus | 🎭 | Ở chế độ LIVE **bị khoá**: không gửi giá trị chưa xác minh vào động cơ ống kính |
| Lens Preset: Save / Load / Unload (4 slot mỗi máy) | 🎭 | Lưu và nạp được dữ liệu, nhưng chưa điều khiển ống kính thật |
| Chỉnh tay sau khi Load → bỏ trạng thái Active | ✅ | |

## Bảo mật của gateway

- Mặc định chỉ lắng nghe `127.0.0.1`; **không có xác thực**. Chạy với `HOST=0.0.0.0` là mở điều khiển máy chiếu cho cả mạng.
- Chỉ kết nối tới IPv4 nội bộ (10/8, 172.16/12, 192.168/16, 169.254/16, 127/8) để không thành cửa SSRF.
- Mật khẩu máy chiếu lưu cùng project trong `localStorage` dưới dạng văn bản thường.
