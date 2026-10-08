# MikMaster — Danh sách công việc

Cập nhật: 2026-10-08, theo lịch sử commit đến `6313bb7` (v0.6.3, 2026-10-01).
Ký hiệu: ✅ xong · 🧪 xong nhưng chỉ kiểm với bộ giả lập (chưa thử máy thật) · ⬜ chưa làm.

> **Nguồn của trạng thái:** thông điệp commit và `docs/features.md`. Hôm nay đã chạy lại trên `main`: `pnpm typecheck` sạch,
> **Vitest 140 test (14 file)** và **test gateway 177 test** đều đạt. **Playwright e2e có 32 test** (CI chạy ở `.github/workflows/ci.yml`);
> lần cập nhật này chưa chạy lại e2e. Không có mục nào được kiểm lại trên máy chiếu thật — mục "máy thật" lấy từ ghi chú của commit.

## A. Frontend (đã hoàn thành)

| # | Công việc | Trạng thái |
|---|---|---|
| A1 | Phân tích thiết kế Figma Make, bóc tách component dùng lại | ✅ |
| A2 | Cấu trúc `src/`: `app pages features components types constants store services hooks utils data` | ✅ |
| A3 | Data schema: `Project`, `Booth` (giao diện gọi là **Group**), `Projector`, `LensPreset`, `ProtocolType`, `TestPattern`, kết nối + log | ✅ |
| A4 | Layout multi-panel Desktop (Dashboard, Detail), Tailwind v4, theme tối / sáng / theo hệ thống | ✅ |
| A5 | Mock data + điều hướng Dashboard ⇄ Detail (React Router hash) | ✅ |
| A6 | Test tự động qua trình duyệt | ✅ Playwright e2e **trong repo** (32 test) + CI GitHub Actions |

## B. Backend gateway (`server/`)

| # | Công việc | Trạng thái |
|---|---|---|
| B1 | Khung TCP: tách khung theo CR / dấu ngoặc, timeout, hàng đợi tuần tự mỗi máy | ✅ |
| B2 | Driver PJLink Class 1/2 (MD5) | ✅ Đọc trạng thái trên RQ35K thật (09-29); lệnh ghi chưa gửi thử |
| B3 | Driver Panasonic NTCONTROL (RQ35K) | 🧪 Máy thật bật chế độ bảo vệ lệnh (NTCONTROL mode 1) nên cần đăng nhập; chưa thử có mật khẩu |
| B4 | Driver Christie serial-over-IP (Griffyn) | ✅ Đọc trạng thái, nhiệt độ, giờ laser, input, vị trí lens trên Griffyn 4K50 thật; lệnh ghi (`(PWR 1)`, `(SHU 1)`…) chưa gửi thử |
| B5 | HTTP API: `health`, `scan` (SSE), `status`, `command`, `raw`, `identify`, `ping`, `preview`, `quick-logins`, `command-overrides`, `license`, `account`, `projects` | ✅ |
| B6 | Chặn SSRF (chỉ IPv4 nội bộ), giới hạn kích thước body, token khi mở ra mạng | ✅ |
| B7 | Bộ giả lập PJLink / Panasonic / Christie / Barco Pulse / Christie web / Supabase (`pnpm sim`; Supabase giả chạy riêng bằng `server/src/sim/supabaseCli.ts`) | ✅ |
| B8 | Test gateway: 177 test (driver, API, license, account, preview, Digest) | ✅ |
| B9 | Web tự phát hiện gateway; lệnh lạc quan + báo lỗi; poll trạng thái; quét mạng thật | ✅ |
| B10 | Khoá tính năng chưa có lệnh xác minh | ✅ Đã nới dần: từng lệnh có tài liệu thì mở, mẫu không hỗ trợ bị làm mờ và không bao giờ gửi (`84a6839`) |
| B11 | Driver **Barco Pulse** (JSON-RPC 2.0, cổng 9090): bật / tắt, shutter, trạng thái, raw; quét có dò Barco | 🧪 Chưa có input. Theo tài liệu do người dùng cung cấp |
| B12 | Panasonic: tối thiểu 0,5 s giữa các lệnh, map lỗi `ER401` / `ER402`; Christie gửi `(PWR 1)` / `(SHU 1)` và đọc `(PWR! 001 "On")` | 🧪 Theo tài liệu người dùng cung cấp |

## C. Hạng mục theo dõi (tính năng và kiểm trên máy thật)

| # | Công việc | Trạng thái | Ghi chú |
|---|---|---|---|
| C1 | Kiểm trên **PT-RQ35K** thật | 🧪 | Đọc qua PJLink ✅. Còn: NTCONTROL cần đăng nhập (`QPW`, `OSH`, `IIS`, nhiệt độ…); độ sáng, test pattern, input RQ35K2 mới chạy bằng bộ giả lập |
| C2 | Kiểm trên **Griffyn** thật | 🧪 | Đọc ✅ (`PWR` `SHU` `SIN` `SST+TEMP` `SST+LGHT` `OSD` `LHO` `LVO` `ZOM` `FCS`). Chưa gửi lệnh ghi nào: bật / tắt, shutter, `(ITP n)`, `(OSD n)`, `(SIN idx)` |
| C3 | Lens: **đọc** vị trí Griffyn ✅. **Di chuyển** và Lens Memory chưa làm | ⬜ | Không gửi lệnh đoán vào động cơ ống kính. Chưa có lệnh lens memory; lens Panasonic chưa làm. Preset hiện chỉ lưu vị trí trong app |
| C4 | Telemetry: Christie nhiệt độ + giờ laser + input ✅; RQ35K giờ đèn qua PJLink ✅ | 🧪 | Nhiệt độ RQ35K đọc từ trang trạng thái web của máy (`simple_status.cgi`, Digest) với `QTM` dự phòng, cả khi standby — cần đăng nhập, chưa kiểm máy thật. Còn: lỗi Christie (`SST+ALRM`) |
| C5 | Driver TCP chung, UDP, Art-Net, HTTP API | ✅ | RAW COMMAND + mẫu lệnh do người dùng khai báo; đọc nhiệt độ / giờ đèn bằng lệnh hỏi tự khai báo |
| C6 | Token cho gateway; `HOST` ngoài loopback tự sinh token | ✅ | Bearer hoặc `?token=`; thiếu / sai → huy hiệu GATEWAY LOCKED + ô nhập token |
| C7 | Lưu project phía server, mật khẩu mã hoá AES-256-GCM; lưu / mở file `*.mikmaster.json` (không chứa mật khẩu) | ✅ | Không có gateway thì dùng localStorage nhưng bỏ mật khẩu |
| C8 | Đóng gói | 🧪 | Windows `MikMaster-Setup.exe` + `MikMaster.exe`, macOS `MikMaster-Setup.pkg` + `MikMaster.dmg` (Node SEA). **Chưa ký số**; `.exe` chưa chạy thử trên Windows thật. Workflow `sync-release.yml` chép bản phát hành sang repo công khai khi đặt biến `RELEASES_REPO` |
| C9 | Kiểm thử + CI | ✅ | Vitest 140, gateway 177, e2e 32; CI chạy typecheck, test, build, e2e |
| C10 | Độ phân giải nhỏ hơn 1440×900 | ✅ | Đã kiểm 1024×700 và 800×600 (09-29). Chưa thấy ghi nhận kiểm lại sau khi Dashboard thêm biểu đồ, thanh tóm tắt và thanh rail (xem E13) |
| C11 | Nhận diện theo IP; ưu tiên PJLink cho Panasonic khi cổng hãng cần đăng nhập mà PJLink thì không | ✅ | Kiểm trên RQ35K thật |
| C12 | **Live preview** | 🧪 | **RQ35K ✅ trên máy thật**: WebSocket `ws://<ip>:8080` (không cần đăng nhập), JPEG ~5 khung/giây, báo BLANK / HDCP. **Griffyn 🧪**: JSON-RPC của trang web máy, cần tài khoản web, mới kiểm bằng giả lập. Máy đang tắt vẫn xem được (đọc thụ động); Pre-Show chỉ là phương án dự phòng, app không tự bật |
| C13 | Test pattern | 🧪 | Christie `(ITP n)` (lưới, trắng, đen, thanh màu; không có mẫu đỏ / xanh lá / xanh dương) theo tài liệu 4K7-HS / 4K10-HS — **chưa kiểm số mẫu trên Griffyn**. Panasonic RQ35K2 `OTS` / `QTS` theo bảng RS-232C chính thức (chỉ giả lập). Mẫu không hỗ trợ bị làm mờ |
| C14 | Độ sáng | 🧪 / ⬜ | Panasonic RQ35K2: LIGHT OUTPUT `VXX:LOPI2` — quy đổi % = giá trị / 10 **chưa xác nhận**, chỉ gửi khi thả thanh trượt. **Griffyn không có lệnh độ sáng** (đã thử `BRT` `LPP` `LOP` `LPM`) |
| C15 | Đổi input | 🧪 | Christie `(SIN idx)` với idx lấy từ danh sách input của máy (cần tài khoản web), Panasonic `IIS` / `QIN` — chưa thử đổi thật. Griffyn không có `(SIN+MAIN n)`. Barco chưa có input |
| C16 | OSD | 🧪 | Christie `(OSD 1)` / `(OSD 0)` (phần đọc đã kiểm trên Griffyn). Panasonic: chưa có lệnh đã xác minh |
| C17 | Mục LỆNH gom vào nút **Nâng cao** | ✅ | |
| C18 | **License** (xem mục D): khoá ký số ngoại tuyến, Free / Pro, dùng vĩnh viễn + cập nhật theo hạn, gắn máy | ✅ | Bản chưa có khoá chạy **Free** (chỉ bật / tắt và shutter); Pro mở preview, input, OSD, test pattern, lens, độ sáng, RAW. Chính sách ở `server/src/license.ts` |
| C19 | Trang **Nâng cao**: tài liệu lệnh theo hãng (nguồn, mức đã kiểm) + sửa lệnh dùng chung cho mọi máy cùng hãng | ✅ | Menu logo → Nâng cao… |
| C20 | Đăng nhập nhanh theo hãng (Panasonic / Christie / Barco) | 🧪 | Lưu mã hoá ở gateway; không có mật khẩu nào trong mã nguồn |
| C21 | **Tài khoản Supabase** + Free 30 ngày theo tài khoản và theo máy | 🧪 | Code + SQL + hướng dẫn xong, thử với Supabase giả. **`SUPABASE_URL` / `SUPABASE_ANON_KEY` đang để trống trong bản phát hành** → tài khoản chưa hoạt động. Việc của bạn: tạo project Supabase, chạy `supabase/schema.sql`, điền URL + anon key ([accounts.md](accounts.md)), bật Confirm email |

## D. Đã làm theo phiên bản (theo lịch sử commit)

| Phiên bản (ngày) | Nội dung | Trạng thái |
|---|---|---|
| **v0.3.0 / v0.3.1** (09-29) | macOS `.dmg`; Windows bộ cài Inno Setup (không cần admin, giữ dữ liệu khi nâng cấp); sửa đăng nhập: trạng thái `auth-failed` tách khỏi lỗi mạng, bảng LOGIN REQUIRED, huy hiệu LOGIN, dừng poll máy bị từ chối. Ghi chú: [releases/v0.3.1.md](releases/v0.3.1.md) | ✅ (bộ cài .exe chưa thử trên Windows thật) |
| **v0.4.0** (09-29) | Cài đặt (theme tối / sáng / hệ thống, English / Tiếng Việt, khoảng cách bật máy 0–60 s); **ALL ON bật lần lượt** có toast tiến độ + STOP, tắt máy huỷ các máy đang chờ; điều khiển hàng loạt theo booth kèm xác nhận khi tắt / đóng shutter; tìm kiếm + lọc trạng thái (phím `/`); thêm / sửa / gỡ máy; Hướng dẫn + Giới thiệu; giao diện tiếng Việt | ✅ (có test và e2e) |
| **v0.5.0 – 0.5.3** (09-29) | Tự nhận diện máy theo IP (`/api/devices/identify`); test pattern theo booth (lệnh người dùng khai báo); nút icon cho nguồn / shutter / OSD / test pattern; cổng điều khiển ẩn mặc định; thanh màu trạng thái trên thẻ; bỏ trường vị trí máy; nút All on / All off to hơn, đặt riêng một hàng; sửa lỗi CI dựng DMG | ✅ / 🧪 (nhận diện cần gateway) |
| **v0.5.4 – 0.5.5** (09-29) | PJLink được chọn cho RQ35K khi cổng hãng cần đăng nhập; Christie đọc thật nhiệt độ / giờ laser / input / lens; preview Christie qua web máy; thumbnail thật trên thẻ Dashboard; đăng nhập nhanh theo hãng | ✅ đọc trên máy thật / 🧪 preview Christie |
| **v0.5.6 – 0.5.9** (09-30) | License Ed25519 gắn máy, khoá gọn `MIKM2`, kiểm tra qua mạng 30 ngày; trang Nâng cao; Christie OSD + `ITP`; macOS `.pkg`; tài khoản Supabase; workflow đồng bộ bản phát hành sang repo công khai; sửa lỗi dựng `.pkg` | ✅ / 🧪 (Supabase giả, kiểm mạng mặc định tắt) |
| **v0.6.0** (09-30) | License vĩnh viễn + hạn cập nhật; nút REFRESH đọc lại mọi máy; preview RQ35K qua WebSocket **kiểm trên máy thật**; khung HDCP; "thời gian từ lúc bật máy"; đọc nhiệt độ Panasonic; đổi chữ Booth → **Group** trên giao diện (dữ liệu giữ nguyên); đăng nhập theo loại máy; tab All gộp thẻ theo group | ✅ / 🧪 |
| **v0.6.1** (09-30) | Bản đồ 2D kéo thả của tab All (vị trí lưu theo project) — **đã bị thay ở bản sau** bằng các bảng Dashboard | ✅ (đã thay) |
| **v0.6.2** (10-01) | Bản **Free / Pro** + trang license khi mở app; **Dashboard**: biểu đồ nhiệt độ theo thời gian kể từ lúc bật máy (nhãn đầu đường, chú giải, di chuột xem thông tin, đánh dấu bật / tắt, biểu tượng kết nối, thang 20–45 °C, khoảng 5 phút / 15 phút / 1 giờ / Tất cả), bảng độ sáng, trạng thái, nhật ký & lỗi, dữ liệu mẫu để xem thử, xuất log ra file (giữ 200 dòng mỗi máy); **Pre-Show**; thanh tóm tắt kết nối, ô All on / All off; thanh trái thu gọn thành rail; trạng thái nguồn đi theo máy (WARMING UP → ON, COOLING DOWN → OFF); **cảnh báo** lỗi / nhiệt độ cao (banner, huy hiệu, cửa sổ nhắc một lần khi vượt 40 °C); xem preview máy đang tắt; trang chi tiết bỏ khối ADVANCED, thêm độ sáng, nút TERMINAL (LOG + RAW) | ✅ (UI, có test) / 🧪 (cần máy thật) |
| **v0.6.3** (10-01) | Panasonic RQ35K2: độ sáng, test pattern, input theo bảng lệnh RS-232C chính thức (2025-08); Christie input `(SIN idx)`; mẫu test pattern không hỗ trợ bị làm mờ, lệnh bị từ chối chỉ ghi cảnh báo (không đánh dấu lỗi giao thức); tài liệu hợp đồng license giữa app và website ([license-contract.md](license-contract.md)) | 🧪 |

## E. Việc còn lại

### Cần bạn quyết định / làm

| # | Việc | Ghi chú |
|---|---|---|
| E1 | **Chốt chính sách Free key `MIKE`**: (A) bắt buộc nhập key / đăng nhập, hay (B) tuỳ chọn, vào thẳng Free | Doc website đang ghi A, app đang làm B; khuyến nghị B ([license-contract.md](license-contract.md) §3). Chặn E2 |
| E2 | App gọi `activate_free_key`, ô nhập `MIKE-…` ở trang license / Cài đặt, báo `other_machine` / `revoked` / `invalid` | Sau E1 |
| E3 | Điền `SUPABASE_URL` / `SUPABASE_ANON_KEY` thật (cùng project với website; chạy `schema.sql` rồi các file `add-*.sql` của website) | Bản đã phát hành để trống → tài khoản, dùng thử, license vĩnh viễn, Free key chưa chạy |
| E4 | Cấp khoá `MIKM2` có `upd` chỉ cho khách có app ≥ 0.6.0 | Bản ≤ 0.5.9 từ chối cờ lạ |
| E5 | Cập nhật doc website: đã có bản phát hành từ 0.6.0; app đã có Free = bật / tắt + shutter | Bên website |
| E6 | Ký số bộ cài (Windows, Apple); thử `MikMaster-Setup.exe` trên Windows thật | Hiện cảnh báo SmartScreen / Gatekeeper |

### Việc kỹ thuật

| # | Việc | Ghi chú |
|---|---|---|
| E7 | Màn hình `outdated`: nút mở `/download` và `/store` | Doc website §5 |
| E8 | Workflow build đặt `MIKMASTER_BUILD_DATE` = thời điểm release (hiện lấy "bây giờ" lúc build) | |
| E9 | URL thu hồi key offline (`DEFAULT_LICENSE_CHECK_URL` đang rỗng → kiểm mạng tắt) | Có thể dùng chung Supabase |
| E10 | **Thử lệnh ghi trên máy thật**, từng lệnh một khi có người đứng cạnh máy: Griffyn `(PWR 1)` `(SHU 1)` `(ITP n)` `(OSD n)` `(SIN idx)`; RQ35K `PON` `POF` `OSH` `IIS` `OTS`; xác nhận quy đổi độ sáng % và số mẫu `ITP` | Kết quả cập nhật vào `src/constants/commandCatalog.ts` (cột mức đã kiểm) |
| E11 | Lens: lệnh di chuyển (`LHO n`, `LMV+*`…) và lens memory cho Griffyn; lens cho RQ35K | Cần tài liệu hãng + thử có người đồng ý từng lệnh |
| E12 | Lỗi Christie (`SST+ALRM`); input Barco; nhiệt độ RQ35K qua NTCONTROL / web (cần đăng nhập) | |
| E13 | Kiểm lại các màn hình Dashboard mới ở 1024×700 và 800×600; chạy lại e2e sau các thay đổi UI lớn | |

## Cách chạy

```bash
pnpm install
pnpm dev            # web, chế độ SIMULATED
pnpm run server     # gateway :8787 → web chuyển sang LIVE (không dùng `pnpm server`: là lệnh có sẵn của pnpm)
pnpm sim            # máy giả lập trên 127.0.0.21/22/23 (macOS: chạy `pnpm sim:mac-alias` một lần, cần mật khẩu)
pnpm test           # Vitest (frontend)
pnpm test:watch
pnpm test:server    # test driver + API
pnpm test:e2e       # Playwright (dùng Chrome có sẵn trên máy)
pnpm typecheck
pnpm build:exe      # file chạy / bộ cài của máy đang dùng
```
