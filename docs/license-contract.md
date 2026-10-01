# Hợp đồng license: app MikMaster ↔ website Mike-Portfolio

Hai repo **dùng chung một Supabase**. File này là nguồn sự thật cho phần chung; mỗi repo giữ một bản sao giống hệt (app: `docs/license-contract.md`, website: `docs/license-contract.md`). Sửa một bên thì sửa bên kia cùng lúc.
Chi tiết sâu hơn: website có [`docs/mikmaster-app-perpetual-license.md`](https://github.com/duyminh-bostrap/Mike-Portfolio) (license vĩnh viễn + Free key); app có [`docs/accounts.md`](accounts.md).

Cập nhật lần cuối: 01/10/2026 (app 0.6.3, đối chiếu với `Mike-Portfolio@main`).

## 1. Ai sở hữu cái gì

| Thành phần | Chủ sở hữu | Bên kia làm gì |
|---|---|---|
| Bảng `trials`, hàm `claim_trial`, `get_entitlement` | **App** (`supabase/schema.sql`) | Website **không sửa**; `tests/sql/fixtures/mikmaster-schema.sql` là bản sao y hệt (đã đối chiếu: giống 100 %) |
| Bảng `entitlements` (`paid_until`, `perpetual`, `updates_until`) | App tạo; website **thêm cột** (`add-licenses.sql`) | App chỉ đọc (qua `get_entitlement`) |
| `license_plans`, `orders`, `license_keys`, các hàm `admin_*`, `create_order`, `apply_paid_order`… | **Website** | App không đụng |
| `free_keys`, `create_free_key`, `revoke_free_key`, `activate_free_key` | **Website** (`add-free-keys.sql`) | App chỉ gọi `activate_free_key` |
| `get_license_info()` | Website | App **không cần** |
| Khoá riêng ký key offline (`~/.mikmaster-license/private.pem`) | **Chủ app, chỉ trên máy người phát hành** | Website **không có và không ký được**; chỉ lưu / hiển thị key đã ký (`admin_attach_license_key`) |
| Khoá công khai (`licenseKey.ts`), `SUPABASE_URL`, `SUPABASE_ANON_KEY` | App | Website dùng cùng project, cùng khoá `anon` |

Quy ước thay đổi: **chỉ thêm cột / hàm mới**, không đổi nghĩa cột hay kiểu trả về đang có (app đã phát hành vẫn gọi chúng). Đổi `get_entitlement` / `claim_trial` = sửa `supabase/schema.sql` của app **và** bản sao `mikmaster-schema.sql` của website trong cùng đợt.

## 2. Cách app quyết định bản Free / Pro

Thứ tự ưu tiên (trên xuống, gặp điều kiện đầu tiên thì dừng):

1. **Key offline hợp lệ** (`MIKM2…` / `MIKM1…`, đúng mã máy, còn hạn, chưa bị thu hồi, `max` máy) → **Pro**.
2. **Tài khoản đã đăng nhập**, `get_entitlement(mã máy)`:
   | `state` | Nghĩa | App |
   |---|---|---|
   | `paid` (+ `expires_at`) | Thuê bao còn hạn | Pro |
   | `paid` (+ `updates_until`) | Vĩnh viễn | Pro nếu `BUILD_DATE ≤ updates_until` (hoặc `null`), ngược lại **`outdated`** → Free + màn hình báo "gia hạn cập nhật / cài bản cũ" |
   | `trial` | Dùng thử 30 ngày (mỗi tài khoản 1 lần, mỗi máy 1 lần) | Pro |
   | `expired`, `other_machine`, `machine_used`, `none` | Hết hạn / khác máy / máy đã dùng thử / chưa có gì | Free |
3. **Key Free (`MIKF-…`)** → **Free**, đã đăng ký máy này (xem §3).
4. Còn lại → **Free** (hiện trang license, bỏ qua được).

- **Free** = chỉ bật / tắt máy và shutter. **Pro** = thêm preview, input, OSD, test pattern, độ sáng, lens, RAW…
- Mất mạng: quyền đã xác nhận còn giá trị tối đa `ONLINE_GRACE_DAYS` = 30 ngày; quá hạn → Free cho tới khi kết nối lại.
- Ngày phát hành: app so `BUILD_DATE` (lúc build) với `updates_until`; website so `publishedAt` của release. Build xong, vài phút sau mới phát hành → app rộng tay hơn website đúng phần chênh đó (chấp nhận được). Workflow build nên đặt `MIKMASTER_BUILD_DATE` = thời điểm tạo release.

## 3. Key Free (`MIKF`): còn lệch, cần chốt

Website đã làm xong: tạo / thu hồi key trên `/account`, `activate_free_key(p_key, p_machine)` (gọi bằng khoá `anon`, không cần đăng nhập), trả `free | other_machine | revoked | invalid`.

**App chưa làm gì cả** (không có `MIKF`, không gọi `activate_free_key`). Hai bên đang lệch chính sách:

| | Website (doc §7) | App hiện tại |
|---|---|---|
| Chưa có key / chưa đăng nhập | "yêu cầu nhập key hoặc đăng nhập" | Vào thẳng **Free**, trang license bỏ qua được |

**Cần chốt một trong hai** (khuyến nghị: B):

- **A. Bắt buộc**: không key, không tài khoản, không license → màn hình chặn, chỉ có ô nhập key Free / đăng nhập. Mỗi tài khoản tối đa 10 máy Free, thu hồi được. Đếm được số máy Free, nhưng người dùng mới gặp rào cản trước khi thử.
- **B. Tùy chọn**: vẫn vào thẳng Free; nhập key Free chỉ để *đăng ký* máy (đếm số máy, thu hồi từ xa). App không bị khóa nếu không nhập.

Việc app cần làm cho cả hai: `account.ts` thêm `activateFreeKey(key)` (POST `/rest/v1/rpc/activate_free_key`, header `apikey`), lưu kết quả `free` gần nhất trong `state.dat`, kiểm lại định kỳ (phát hiện `revoked`), thêm ô nhập `MIKF-…` ở trang license / Cài đặt → Bản quyền, thông báo cho 3 lỗi (`other_machine`, `revoked`, `invalid`). Thêm trạng thái `LicenseStatusDto.state = 'free'` (hiện chỉ có `licensed | trial | unlicensed | signin | expired | outdated | unverified | revoked`).

## 4. Việc còn lại (theo thứ tự)

| # | Việc | Bên | Ghi chú |
|---|---|---|---|
| 1 | Chốt chính sách Free key (§3: A hay B) | Chủ dự án | Chặn #2 |
| 2 | App: gọi `activate_free_key` + UI + test | App | Sau #1 |
| 3 | Điền `SUPABASE_URL` / `SUPABASE_ANON_KEY` thật vào `licenseKey.ts` (hiện **rỗng** ở bản đã phát hành → tài khoản, dùng thử, license vĩnh viễn, Free key đều chưa hoạt động trong app) | App | Cùng project với website; chạy `schema.sql` rồi các file `add-*.sql` của website trên project đó |
| 4 | Màn hình `outdated`: nút mở `/download` và `/store` | App | Doc website §5 |
| 5 | Workflow build đặt `MIKMASTER_BUILD_DATE` = thời điểm release | App | Hiện lấy "bây giờ" lúc build |
| 6 | Khoá `MIKM2` có `upd`: chỉ cấp cho khách sau khi họ có app ≥ 0.6.0 (app ≤ 0.5.9 từ chối cờ lạ) | Chủ dự án | Hiện app 0.6.x đã hiểu `upd` |
| 7 | Cập nhật doc website: §5 "chưa có bản phát hành" → đã có từ 0.6.0; §7 "app đang `restricted` chỉ xem" → app đã có Free = bật / tắt + shutter (0.6.0) | Website | |
| 8 | URL thu hồi online cho key offline (`DEFAULT_LICENSE_CHECK_URL` đang rỗng) | App + website | Có thể dùng chung Supabase thay cho file ký riêng |

## 5. Kiểm thử chung

- Website: `tests/sql/*.test.ts` chạy trên `mikmaster-schema.sql` → bắt được lệch giữa hai bên khi nhớ cập nhật bản sao.
- App: `server/test` (license, account) dùng `fetch` giả với đúng các `state` ở §2.
- Kiểm tay: doc website §6 (tạo license Perpetual 365 ngày trong Dashboard → app hiện "vĩnh viễn · cập nhật đến …" → ép `updates_until` về quá khứ → bản mới bị chặn).
