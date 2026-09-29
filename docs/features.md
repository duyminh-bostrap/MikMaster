# MikMaster — Danh sách tính năng

Kiến trúc dữ liệu: **Project → Booth → Projector**. Máy chiếu mục tiêu: **Panasonic PT-RQ35K** và **Christie Griffyn 4K32-RGB** (ngoài ra PJLink và các giao thức chung).

## Cách đọc trạng thái

| Ký hiệu | Nghĩa |
|---|---|
| ✅ | Đã làm và đã kiểm tự động (unit / tích hợp / e2e), không phụ thuộc phần cứng |
| 🧪 | Đã làm, **chỉ kiểm với bộ giả lập** viết theo tài liệu; **chưa thử trên máy thật** |
| 🎭 | Chỉ mô phỏng trong UI; không điều khiển thiết bị |
| ⬜ | Chưa làm |

Hai chế độ chạy, hiển thị ở chân trang:

- **LIVE** — có gateway (`pnpm server` / `pnpm start`): lệnh và trạng thái đi tới máy chiếu thật.
- **SIMULATED** — không có gateway: dữ liệu mẫu, để demo và phát triển UI. Bấm huy hiệu để tìm lại gateway.
- **GATEWAY LOCKED** — gateway chạy ở chế độ mở ra mạng và cần token: bấm huy hiệu để nhập.

## 1. Project

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Tạo project: tên + Booth trên một trang → quét | ✅ | Booth tuỳ chọn; mặc định "Booth 1" |
| Sau quét: **LOGIN & LAUNCH** (một tài khoản cho mọi máy, mặc định `admin`/`admin`) hoặc **LAUNCH WITHOUT LOGIN** | ✅ | |
| Mở project đã lưu, xoá project đã lưu | ✅ | Project mẫu không xoá được |
| Lưu project: trên gateway (mật khẩu mã hoá AES-256-GCM) hoặc trong trình duyệt (không lưu mật khẩu) | ✅ | |
| **Lưu ra file / mở từ file** `*.mikmaster.json` | ✅ | File không chứa mật khẩu; mở file hỏi đăng nhập một lần |
| Menu logo: New · Open file · Open Recent · Save · Export (⌘O, ⌘S, ⇧⌘S) | ✅ | Bấm hoặc chuột phải vào logo |
| Hỏi **Save / Don't save / Cancel** khi rời project có thay đổi chưa lưu | ✅ | Có dấu UNSAVED ở sidebar; trình duyệt cảnh báo khi đóng tab |
| Đổi tên project / booth bằng double-click | ✅ | |
| Thêm / sửa / xoá booth (máy chuyển sang booth khác) | ✅ | |
| Sửa thông tin máy (tên, vị trí, model, booth), gỡ máy | ✅ | Menu chuột phải hoặc tên máy ở trang Detail |

## 2. Kết nối mạng

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Quét dải `/24` | 🧪 | LIVE: thử cổng PJLink 4352, Panasonic 1024, Christie 3002. Một IP = một máy (ưu tiên giao thức của hãng hơn PJLink) |
| Thêm máy thủ công qua IP | ✅ | |
| **Ping**: ICMP + mở cổng điều khiển TCP, kèm độ trễ | ✅ | Trang Detail và menu chuột phải; cần gateway |
| Đăng nhập từng máy, dùng chung một tài khoản cho mọi hãng | ✅ | Kiểm thật qua gateway trước khi lưu; cache trong phiên (sessionStorage) |
| Reconnect | ✅ | LIVE: đọc trạng thái thật ngay |
| Cảnh báo rớt mạng / sai giao thức / sai mật khẩu | ✅ | Ngừng poll máy bị từ chối xác thực để máy chiếu không khoá cổng |
| PJLink Class 1/2 | 🧪 | MD5, POWR/INPT/AVMT/ERST/LAMP/INF |
| Panasonic NTCONTROL (RQ35K) | 🧪 | Banner + MD5/SHA-256 challenge |
| Christie serial-over-IP (Griffyn) | 🧪 | Khung `(CODE…)` |
| TCP chung, UDP, Art-Net, HTTP API | ✅ | RAW COMMAND + **mẫu lệnh** Power / Shutter do người dùng khai báo |

## 3. Dashboard

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Sidebar theo Booth, grid toàn bộ / lọc theo Booth | ✅ | Booth đang lọc nằm trên URL |
| **Chuyển máy sang booth khác**: kéo thả hoặc chuột phải | ✅ | |
| Quick Controls ALL ON / ALL OFF / SHUTTER theo project hoặc booth | 🧪 | |
| Chỉ số: Fleet Health, cảnh báo, nhiệt độ TB, giờ đèn | ✅ | |
| Poll trạng thái thật 4 giây | 🧪 | Chỉ giao thức có driver |

## 4. Trang chi tiết

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Power ON / OFF, Shutter, Input | 🧪 | Christie chưa có Input |
| OSD ON / OFF | 🎭 | Chưa có lệnh đã xác minh: chỉ đổi trạng thái trong app |
| Test Pattern | 🎭 | LIVE bị khoá: chưa có lệnh xác minh |
| Lens Shift / Zoom / Focus, Lens Preset | 🎭 | LIVE bị khoá: không gửi lệnh đoán vào động cơ ống kính |
| Raw Command | 🧪 | Đối chiếu lệnh với máy thật |

## 5. Chạy / đóng gói

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Cài như app từ Chrome / Edge (PWA) | ✅ | `pnpm start`, mở `http://127.0.0.1:8787` → Install. Chưa thử nút cài trên máy người dùng |
| Chạy từ VS Code (F5) | ✅ | Dev: Gateway + Web, Build, Test |
| Bộ cài `MikMaster-Setup.exe` (Windows, không cần admin) · `MikMaster.dmg` (Mac) · Quit từ menu logo | ✅ | Không cần cài Node; tự mở trình duyệt. Chưa ký số; .exe chưa thử trên Windows thật |

## Bảo mật

- Gateway mặc định chỉ nghe `127.0.0.1`. Mở ra mạng (`HOST=0.0.0.0`) thì **bắt buộc token** (tự sinh nếu chưa đặt `MIKMASTER_TOKEN`).
- Chỉ kết nối / ping tới IPv4 nội bộ (10/8, 172.16/12, 192.168/16, 169.254/16, 127/8) để không thành cửa SSRF; HTTP API không đi theo redirect.
- Mật khẩu máy chiếu: mã hoá trên đĩa ở gateway; **không** ghi vào localStorage hay file project; cache đăng nhập chỉ trong phiên trình duyệt.
