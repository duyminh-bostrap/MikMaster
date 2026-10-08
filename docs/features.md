# MikMaster — Danh sách tính năng

Kiến trúc dữ liệu: **Project → Group → Projector**. Máy chiếu mục tiêu: **Panasonic PT-RQ35K** và **Christie Griffyn 4K32 / 4K50-RGB** (ngoài ra PJLink, Barco Pulse và các giao thức chung). Giao diện gọi nhóm máy là **Group**; trong dữ liệu, code và các mục cũ bên dưới vẫn là `booth`.

## Cách đọc trạng thái

| Ký hiệu | Nghĩa |
|---|---|
| ✅ | Đã làm và đã kiểm tự động (unit / tích hợp / e2e), không phụ thuộc phần cứng |
| 🧪 | Đã làm, **chỉ kiểm với bộ giả lập** viết theo tài liệu; **chưa thử trên máy thật** |
| 🎭 | Chỉ mô phỏng trong UI; không điều khiển thiết bị |
| ⬜ | Chưa làm |

Hai chế độ chạy, hiển thị ở chân trang:

- **LIVE** — có gateway (`pnpm run server` / `pnpm start`): lệnh và trạng thái đi tới máy chiếu thật.
- **SIMULATED** — không có gateway: dữ liệu mẫu, để demo và phát triển UI. Bấm huy hiệu để tìm lại gateway.
- **GATEWAY LOCKED** — gateway chạy ở chế độ mở ra mạng và cần token: bấm huy hiệu để nhập.

## 1. Project

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Tạo project: tên + Group trên một trang → quét | ✅ | Group tuỳ chọn; mặc định "Group 1" |
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
| Panasonic NTCONTROL (RQ35K) | 🧪 | Banner + MD5/SHA-256 challenge; tối thiểu 0,5 s giữa các lệnh; mã lỗi ER401/ER402 |
| Christie serial-over-IP (Griffyn) | 🧪 | Khung `(CODE…)`; lệnh `(PWR 1)` / `(SHU 1)` theo tài liệu người dùng cung cấp (09/2026) |
| Barco Pulse (UDX, F-series…) — JSON-RPC 2.0, cổng 9090 | 🧪 | Bật / tắt, shutter, trạng thái; chưa có input. Theo tài liệu người dùng cung cấp |
| TCP chung, UDP, Art-Net, HTTP API | ✅ | RAW COMMAND + **mẫu lệnh** Power / Shutter do người dùng khai báo |

## 3. Dashboard

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Sidebar theo Group (thu gọn thành thanh rail hẹp), grid toàn bộ / lọc theo group | ✅ | Group đang lọc nằm trên URL |
| **Độ sáng, test pattern, input (Panasonic RQ35K2)**: đặt và đọc lại — độ sáng = LIGHT OUTPUT (`VXX:LOPI2` / `QVX:LOPI2`), test pattern `OTS` / `QTS` (trắng, đen, crosshatch / grid, color bars, focus), input `IIS` / `QIN`; giao diện hiện giá trị máy báo, độ sáng chỉ gửi khi thả thanh trượt | ✅ (bằng máy giả lập) | Theo bảng lệnh RS-232C chính thức RQ35K2 (2025-08); **chưa kiểm trên máy thật** (NTCONTROL đòi đăng nhập). Quy đổi độ sáng % = giá trị / 10 chưa được xác nhận |
| **Đổi input Christie** `(SIN idx)`, idx lấy từ danh sách input của máy (cần tài khoản web của máy) | ✅ (bằng máy giả lập) | Griffyn **không có** `(SIN+MAIN n)` (đã thử: Control Not Found); trang web của máy chọn input bằng `(SIN idx)`. Chưa thử đổi thật. Griffyn cũng không có lệnh độ sáng (`BRT`, `LPP`, `LOP`, `LPM`… đã thử) nên độ sáng Christie chưa làm |
| **Chuyển máy sang group khác**: kéo thả hoặc chuột phải | ✅ | |
| Tab **All** có hai cách xem (nút ở đầu thanh lọc): **Groups** (thẻ gộp theo group, thu gọn / mở từng group; group thu gọn chỉ hiện ảnh preview, rê chuột để xem thông tin) và **Dashboard** — theo dõi: **biểu đồ đường nhiệt độ theo thời gian kể từ lúc bật máy** (nhãn ở cuối đường, chú giải mọi máy kèm trạng thái kết nối và nhiệt độ, rê chuột vào đường để xem máy, đánh dấu bật / tắt, đường ngắt khi mất kết nối; khoảng 5 phút / 15 phút / 1 giờ / Tất cả), bảng độ sáng, thời gian từ lúc bật máy (tính từ lúc app thấy máy bật), trạng thái, nhật ký & lỗi; bấm hàng để mở máy | ✅ | Chịu bộ lọc / tìm kiếm. Lịch sử chỉ giữ trong bộ nhớ và chỉ ghi khi có gateway. Có nút **dữ liệu mẫu** để xem thử khi chưa có máy. Thang nhiệt độ 20–45 °C (cảnh báo > 33, nguy hiểm > 40). Độ sáng: Panasonic RQ35K2 đọc từ máy (chỉ kiểm bằng giả lập), máy khác là giá trị trong app |
| Điều khiển hàng loạt (tab All hoặc từng group), nút icon: nguồn, shutter, OSD, test pattern; tắt máy / đóng shutter / hiện pattern hỏi xác nhận | 🧪 | Chưa thử trên máy thật |
| **Bật lần lượt**: ALL ON bật từng máy cách nhau N giây (Cài đặt, 0–60 s, mặc định 5) để tránh sụt điện; thông báo tiến độ (máy thứ mấy, máy kế tiếp, đếm ngược) và nút **STOP**; tắt máy huỷ các máy đang chờ | ✅ | Có test (`powerSequence`) và e2e. Chạy trong trình duyệt: đóng tab giữa chừng thì các máy còn lại không được bật |
| Tìm máy (tên, IP, model, booth; phím /) và lọc theo trạng thái | ✅ | |
| Thêm / sửa / gỡ máy chiếu trên Dashboard (nút ở cuối sidebar, chuột phải vào thẻ) | ✅ | |
| Nhập IP → tự nhận diện giao thức, cổng, model và đặt tên theo model | 🧪 | Cần gateway; model đọc qua PJLink (INF2) hoặc giao thức hãng |
| Cổng điều khiển ẩn mặc định (dùng cổng chuẩn của giao thức), đổi được khi cần | ✅ | |
| Hàng đầu tab All: hai ô lớn **All on / All off** (cũng là nút bật / tắt tất cả; ghi số máy đang khởi động / làm nguội), cụm nút shutter / OSD / test pattern; số máy đang kết nối nằm ở thanh trên cạnh đồng hồ | ✅ | Thay cho vòng tròn Fleet Health và dòng ONLINE cũ |
| Nút **REFRESH** ở thanh trên: đọc lại ngay mọi máy | ✅ | Máy bị từ chối đăng nhập không bị thử lại |
| **Cảnh báo**: banner khi có lỗi hoặc nhiệt độ cao, huy hiệu nhiệt độ trên thẻ, cửa sổ nhắc một lần khi máy vượt 40 °C (đặt lại khi nguội) | ✅ | Chỉ tính máy đang kết nối |
| **Trạng thái nguồn đi theo máy**: gửi lệnh thành công → WARMING UP rồi ON khi máy xác nhận; tắt → COOLING DOWN rồi OFF; màu và chữ theo từng trạng thái | 🧪 | Cần gateway; chế độ mô phỏng đổi thẳng sang trạng thái cuối |
| Thẻ có **ảnh preview thật** (làm mới mỗi 3 giây) | 🧪 | Bản Pro; xem mục preview ở §7 |
| **Lưu log** ra file: toàn bộ project hoặc từng máy (giữ 200 dòng mỗi máy) | ✅ | |
| Ghi nhớ các lựa chọn giao diện giữa các lần mở | ✅ | |
| Poll trạng thái thật 4 giây | 🧪 | Chỉ giao thức có driver |

## 4. Trang chi tiết

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Power ON / OFF, Shutter, Input | 🧪 | Input: PJLink, Panasonic `IIS`, Christie `(SIN idx)` (cần tài khoản web của máy); Barco chưa có Input |
| OSD ON / OFF | 🧪 / 🎭 | Christie `(OSD 1)` / `(OSD 0)` gửi thật (phần đọc đã kiểm trên Griffyn). Máy khác: chưa có lệnh đã xác minh, chỉ đổi trạng thái trong app |
| Test Pattern (từng máy và cả group) | 🧪 | **Panasonic RQ35K2** `OTS` / `QTS`: trắng, đen, crosshatch / grid, color bars, focus. **Christie** `(ITP n)`: lưới, trắng, đen, thanh màu. Mẫu máy không có (đỏ / xanh lá / xanh dương, gray ramp, crosshair…) bị làm mờ và không bao giờ gửi. Giao thức khác: nhập lệnh bật / tắt ở mục LỆNH. Số mẫu `ITP` chưa kiểm trên Griffyn |
| Lens Shift / Zoom / Focus, Lens Preset | 🎭 | Christie: **đọc** vị trí lens từ máy ✅ (chỉ đọc). Di chuyển và preset: LIVE bị khoá, không gửi lệnh đoán vào động cơ ống kính; preset chỉ lưu vị trí trong app |
| **Độ sáng** (dưới Lens Preset): đặt và đọc lại | 🧪 | Panasonic RQ35K2 (`VXX:LOPI2`); Griffyn không có lệnh độ sáng |
| **Preview** ngay trên trang máy (bản Pro) | ✅ RQ35K (máy thật) · 🧪 Griffyn | Máy đang tắt vẫn xem được (đọc thụ động); nút **Pre-Show** (Panasonic) chỉ là phương án khi không có ảnh; báo "HDCP" / "BLANK" |
| Nút **TERMINAL**: LOG và RAW COMMAND (đối chiếu lệnh với máy thật) gom một chỗ | 🧪 | |

## 5. Cài đặt, ngôn ngữ, trợ giúp

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Cài đặt: theme Tối / Sáng / Theo hệ thống, ngôn ngữ English / Tiếng Việt, khoảng cách bật máy (0–60 s) | ✅ | Lưu trong trình duyệt, không đi theo project. Ngôn ngữ mặc định theo trình duyệt (vi → Tiếng Việt) |
| Hướng dẫn và Giới thiệu trong menu logo | ✅ | |
| Đăng nhập máy ở góc trên bên phải trang máy chiếu | ✅ | Chỉ hiện khi máy cần đăng nhập |
| **Đăng nhập nhanh theo hãng** (Panasonic / Christie / Barco): đăng nhập thành công một lần → lưu làm tài khoản của hãng → các máy cùng hãng chỉ bấm một nút | 🧪 | Tài khoản lưu mã hoá ở gateway (`quick-logins.json`, AES-256-GCM); **không ghi sẵn mật khẩu nào trong mã nguồn** |

## 6. Chạy / đóng gói

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Cài như app từ Chrome / Edge (PWA) | ✅ | `pnpm start`, mở `http://127.0.0.1:8787` → Install. Chưa thử nút cài trên máy người dùng |
| Chạy từ VS Code (F5) | ✅ | Dev: Gateway + Web, Build, Test |
| Bộ cài `MikMaster-Setup.exe` (Windows, không cần admin) · `MikMaster-Setup.pkg` và `MikMaster.dmg` (Mac) · Quit từ menu logo | ✅ | Không cần cài Node; tự mở trình duyệt. Chưa ký số; .exe chưa thử trên Windows thật |
| Đồng bộ bản phát hành sang repo công khai (`sync-release.yml`) | 🧪 | Chỉ chạy khi đặt biến `RELEASES_REPO`; chỉ bản mới nhất được đánh dấu Latest |

## Trang Nâng cao (menu logo → Nâng cao…)

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Tài liệu lệnh theo hãng (PJLink, Panasonic, Christie, Barco): lệnh, chức năng, hỏi / ghi, nguồn tài liệu, mức đã kiểm (đã kiểm trên máy / theo tài liệu / chưa kiểm); tìm kiếm, lọc hỏi / ghi | ✅ | Danh mục ở `src/constants/commandCatalog.ts` — bổ sung khi có lệnh mới. Không cần mở project |
| **Sửa lệnh dùng chung cho mọi máy cùng hãng** (nguồn, shutter, test pattern, đọc nhiệt độ / giờ đèn); lệnh trống = giữ lệnh có sẵn của driver (hiện mờ làm gợi ý), nút Về mặc định | ✅ | Lưu ở gateway (`command-overrides.json`), gửi nguyên văn qua đường RAW thay cho lệnh có sẵn; lệnh riêng của từng máy (Nâng cao trên trang máy) được ưu tiên. Cần gateway |

## Tài khoản (Supabase) và Free 30 ngày

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Khi đã cấu hình Supabase: mở app hiện màn hình **Đăng nhập / Tạo tài khoản Free 30 ngày / Nhập key offline** cho tới khi có quyền dùng | ✅ (bằng Supabase giả) | Chưa cấu hình → trang **yêu cầu license** chỉ có ô nhập khoá. Hướng dẫn: [docs/accounts.md](accounts.md); SQL: `supabase/schema.sql` |
| Dùng thử 30 ngày do **máy chủ** quyết định: mỗi tài khoản một lần, mỗi máy một lần (tạo tài khoản khác trên cùng máy không được thêm) | ✅ (bằng Supabase giả) | Cần bạn tạo project Supabase, chạy `schema.sql` và điền URL + khoá anon; **chưa thử với Supabase thật** |
| Key offline vẫn dùng được, gắn với máy | ✅ | Vào app không cần tài khoản |
| Gói trả phí gắn với tài khoản (bảng `entitlements`) | 🧪 | Cấp bằng SQL |
| Mất mạng: quyền đã xác nhận còn giá trị tối đa 30 ngày; kiểm tra lại mỗi 6 giờ, đăng nhập và nút "Kiểm tra ngay" | ✅ | |
| Mật khẩu chỉ đi qua gateway tới Supabase, không lưu; ở máy lưu email + refresh token mã hoá (AES-256-GCM, khoá theo mã máy) | ✅ | |

## Mô hình bản quyền: dùng vĩnh viễn + cập nhật theo hạn (như TouchDesigner / Resolume)

| Tình huống | Kết quả |
|---|---|
| Mua license | **Dùng vĩnh viễn**, kèm thời hạn cập nhật (mặc định 12 tháng) |
| Trong thời hạn cập nhật | Dùng được mọi phiên bản mới phát hành |
| Hết thời hạn cập nhật | Vẫn dùng được **mọi phiên bản phát hành trước hoặc trong ngày hết hạn**; phiên bản phát hành **sau** ngày đó báo "mới hơn thời hạn cập nhật của bạn" cho tới khi gia hạn |
| Gia hạn | Cộng tiếp từ ngày cập nhật cuối nếu còn hạn, không thì từ hôm nay |
| Cách kiểm | Mỗi bản build ghi **ngày phát hành**; khoá / tài khoản ghi **"cập nhật đến ngày X"**; app so ngày phát hành của chính nó với X (khoá hết X vào cuối ngày) |
| Cảnh báo | Huy hiệu vàng khi còn ≤ 30 ngày cập nhật; Cài đặt → Bản quyền hiện "Vĩnh viễn · Cập nhật đến …" |

Áp dụng cho cả **key offline** (`node scripts/license.mjs issue … --updates-days 365`, gia hạn bằng `renew <id> --updates-days 365`) và **tài khoản** (cột `perpetual`, `updates_until` trong `entitlements`, xem `supabase/schema.sql`). Khoá / gói cũ không có ngày cập nhật vẫn chạy với mọi phiên bản như trước; `--days` vẫn là hạn dùng cứng (thuê bao).
**Lưu ý:** các bản build trước tính năng này (≤ 0.5.9) không đọc được khoá có ngày cập nhật.

## Bản quyền (license)

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Khoá ký số Ed25519, kiểm ngoại tuyến bằng khoá công khai nhúng trong app. Định dạng gọn `MIKM2-…` (~115–140 ký tự); khoá cũ `MIKM1.…` (~220 ký tự) vẫn dùng được | ✅ | Cấp bằng `node scripts/license.mjs issue --licensee "Tên" [--max N] [--days N] [--machine MÃ]`. Khoá bí mật ở `~/.mikmaster-license/private.pem`, **không nằm trong repo** — sao lưu cẩn thận |
| **Hai bản**: **Free** (chưa có license hợp lệ / hết hạn / quá hạn cập nhật) chỉ **bật / tắt máy và shutter** (không giới hạn số máy); **Pro** (có khoá hợp lệ) mở khoá preview, input, OSD, test pattern, lens, độ sáng, RAW. Gateway từ chối tính năng Pro ở bản Free bằng 402 `license`; giao diện khoá nút và hiện nút MỞ KHOÁ PRO; có Pro thì nhãn **PRO** màu cam hiện cạnh logo. Mở app ở bản Free hiện trang license, bỏ qua được. Không còn dùng thử cục bộ — khoá dùng thử 30 ngày do web cấp | ✅ | Chính sách ở `server/src/license.ts` (`requirePro`) |
| Có khoá: giới hạn số máy chiếu làm việc trong 10 phút gần nhất theo `max` (0 = không giới hạn) | ✅ | |
| **Gắn khoá với máy tính** (mã máy = băm một chiều định danh phần cứng) và **gỡ key khỏi máy này** để chuyển máy: nhận "mã gỡ" → người cấp chạy `rebind` cấp khoá mới cho máy kia | ✅ | Sổ cấp phát `~/.mikmaster-license/issued.json`. Không có máy chủ nên "gỡ" chỉ là biên nhận, khoá gắn máy nào chỉ chạy được trên máy đó |
| **Cảnh báo** khi dùng thử / khoá còn ≤ 14 ngày (huy hiệu chân trang + Cài đặt) | ✅ | |
| **Kiểm tra qua mạng ≥ 30 ngày một lần** (khi đã đặt địa chỉ kiểm tra `MIKMASTER_LICENSE_URL` hoặc `licenseKey.ts`): file trạng thái đã ký (`node scripts/license.mjs status`) chứa danh sách khoá bị thu hồi. Quá 30 ngày không tải được → bị giới hạn tới khi kết nối lại; cảnh báo khi còn ≤ 14 ngày; nút "Kiểm tra ngay" | 🧪 | Chưa có địa chỉ kiểm tra thật → mặc định **tắt**. Đăng file trạng thái lên hosting tĩnh bất kỳ và nhớ đăng lại mới định kỳ |

**Chống crack — đã làm:** khoá không sửa / ghép / cắt được (chữ ký phủ toàn bộ dữ liệu, có tiền tố riêng nên không dùng lại chữ ký của file khác); trạng thái dùng thử / lần kiểm tra mạng được niêm phong bằng HMAC và lưu 2 nơi (sửa tay bị phát hiện, xoá một bản được khôi phục, chép từ máy khác không hợp lệ); chỉnh đồng hồ lùi không kéo dài được dùng thử / hạn khoá; file trạng thái cũ hơn file đã nhận bị bỏ qua (không hoàn tác thu hồi).

**Không thể ngăn (giới hạn của license ngoại tuyến):** người biết vá mã của app (thay khoá công khai, bỏ đoạn kiểm tra) hoặc xoá cả hai nơi lưu trạng thái + cài lại thì vượt được. Cách giảm rủi ro: ký số app (Windows / Apple), và nếu cần chặt hơn thì chuyển sang kích hoạt qua máy chủ.

## Bảo mật

- Gateway mặc định chỉ nghe `127.0.0.1`. Mở ra mạng (`HOST=0.0.0.0`) thì **bắt buộc token** (tự sinh nếu chưa đặt `MIKMASTER_TOKEN`).
- Chỉ kết nối / ping tới IPv4 nội bộ (10/8, 172.16/12, 192.168/16, 169.254/16, 127/8) để không thành cửa SSRF; HTTP API không đi theo redirect.
- Mật khẩu máy chiếu: mã hoá trên đĩa ở gateway; **không** ghi vào localStorage hay file project; cache đăng nhập chỉ trong phiên trình duyệt.

## 7. Kiểm trên máy thật (2026-09-29, chỉ gửi lệnh hỏi)

Hai máy thử: **Panasonic PT-RQ35K** `192.168.1.176` (firmware 1.21) và **Christie Griffyn 4K50-RGB** `192.168.1.107` (griffyn 1.3.7).

| Thông tin | PT-RQ35K (PJLink — hãng khuyên dùng) | Griffyn (Christie serial 3002) |
|---|---|---|
| Nguồn bật / tắt (đọc) | ✅ `POWR ?` | ✅ `(PWR?)` |
| Shutter (đọc) | ✅ `AVMT ?` | ✅ `(SHU?)` |
| Input (đọc) | ✅ `INPT ?` (máy chỉ có HDMI 1 / 2 qua PJLink) | ✅ `(SIN?)` → "One-Port HDMI0" = HDMI 1 |
| Giờ đèn / laser | ✅ `LAMP ?` | ✅ `(SST+LGHT?)` Laser On Hours; dự phòng `(SST+SYST?)` Projector Hours |
| Nhiệt độ | 🧪 PJLink không có lệnh nhiệt độ; app đọc từ trang trạng thái web của máy (`simple_status.cgi`, Digest) với `QTM` dự phòng, cả khi standby — cần đăng nhập, chưa kiểm trên máy thật | ✅ `(SST+TEMP?)`: nhiệt độ khí vào + 12 cảm biến (trang máy: "Tất cả cảm biến") |
| Lỗi | ✅ `ERST ?` | ⬜ (có nhóm `SST+ALRM`, chưa đưa vào) |
| Độ sáng | ⬜ PJLink không có lệnh | ⬜ Griffyn không có `LPP` / `LOP` / `BRT` (Control Not Found) |
| Đổi input (ghi) | 🧪 PJLink `INPT 31/32` — chưa gửi thử | 🧪 `(SIN idx)`, idx lấy từ danh sách input của máy (cần tài khoản web); chưa thử đổi thật. Không có `(SIN+MAIN n)` |
| Vị trí lens (đọc) | ⬜ PJLink không có | ✅ `LHO?` `LVO?` `ZOM?` `FCS?` (đơn vị của máy) — ô "Vị trí lens (máy báo)" ở cột lens |
| Test pattern | ⬜ PJLink không có | 🧪 `(ITP n)` theo tài liệu Christie 4K7-HS/4K10-HS: lưới, trắng, đen, thanh màu (nút Test pattern gửi thẳng); đỏ / xanh lá / xanh dương phẳng báo không hỗ trợ vì Griffyn không có các mẫu đó. **Chưa kiểm số mẫu trên Griffyn** |
| OSD hiện / ẩn | ⬜ | 🧪 `(OSD 1)` / `(OSD 0)`, trạng thái đọc từ `(OSD?)` (đã kiểm phần đọc trên Griffyn); nút OSD gửi thẳng |
| Live preview | ✅ Panasonic RQ35K (đã kiểm trên máy thật): WebSocket `ws://<ip>:8080` (giao thức `pj-cast-protocol`, **không cần đăng nhập**), ảnh JPEG 480×304 ~5 khung/giây, một kết nối dùng chung cho mọi thẻ; báo "không có tín hiệu" (BLANK) / "HDCP". Xem khi máy đang bật (Pre-Show cho phép xem cả khi standby nhưng đó là cài đặt máy, app không tự bật) | 🧪 Ảnh tín hiệu vào qua web của máy (JSON-RPC `/cgi-bin/c4jweb`: `session:connect` → `video:getInputInfo` → `/cgi-bin/thumbnail`), làm mới mỗi giây ở trang máy, mỗi 3 giây ở thẻ Dashboard (thẻ có thumbnail thật). **Cần tài khoản web** (hoặc đăng nhập nhanh của hãng) — nhập ở góc trên bên phải trang máy ("Tài khoản web"). Đã kiểm với bộ giả lập; chưa kiểm với máy thật vì cần đăng nhập |

Nhập IP một máy Panasonic trả lời cả PJLink lẫn NTCONTROL → app chọn **PJLink**. Preset PT-RQ35K cũng dùng PJLink.

## Nhiệt độ và giờ đèn

- **PJLink:** giờ đèn đọc sẵn (`LAMP ?`); PJLink không có lệnh nhiệt độ.
- **Christie:** nhiệt độ các cảm biến (`SST+TEMP`) và giờ laser (`SST+LGHT`) đọc sẵn mỗi lần poll.
- **Giao thức khác:** tự khai báo ở mục LỆNH trên trang máy chiếu: lệnh hỏi (từ manual) + mẫu lấy số (nhóm 1; bỏ trống = số cuối trong phản hồi). Lỗi truy vấn chỉ giữ giá trị cũ, không ảnh hưởng trạng thái nguồn.
