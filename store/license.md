# Bản quyền MikMaster: bảng, hợp đồng và mức đã thực thi

Tài liệu này dành cho chủ sản phẩm. Nó ghi chính xác app làm gì hôm nay, phân biệt phần đã thực thi với phần chưa. Nguồn sự thật cho hợp đồng giữa app và website là `docs/license-contract.md` (cập nhật 01/10/2026, app 0.6.3). Phần dành cho khách nằm ở `docs/13-editions-and-licensing.md`.

## Bảng bản

| | Free | Pro |
|---|---|---|
| Điều kiện | Chưa có bản quyền hợp lệ, hết hạn, quá hạn cập nhật, chưa xác minh được, bị thu hồi | Có khoá ngoại tuyến hợp lệ, hoặc tài khoản có quyền dùng |
| Nguồn và shutter | Có | Có |
| Quét mạng, project, group, giám sát | Có | Có |
| Hình trực tiếp, input, OSD, test pattern, độ sáng, lens, RAW COMMAND | Không | Có (lens hiện bị khoá ở chế độ máy thật cho mọi bản) |
| Số máy chiếu | Không giới hạn trong API | Tối đa `max` của khoá (0 = không giới hạn) |

TODO(owner): Tên gói, giá, thuê bao hay vĩnh viễn là gì? Không có trong kho mã. Website sở hữu bảng `license_plans`.

TODO(owner): Free có giới hạn số máy chiếu hay không? `server/src/license.ts` có hằng `FREE_LIMIT = 3`, được báo trong API và dòng log khởi động ("limited to 3 projectors, no control"), nhưng hàm đếm giới hạn chỉ áp `max` của khoá hợp lệ, nên Free thực tế không giới hạn. Cần chốt một chính sách rồi sửa cho khớp.

## Thời gian dùng thử

- 30 ngày, cấp qua tài khoản (`claim_trial`): mỗi tài khoản một lần và mỗi máy một lần.
- Dùng thử cục bộ không cần tài khoản (`TRIAL_DAYS`) bị tắt trong sản phẩm; chỉ bật được cho kiểm thử.
- Đường dùng thử qua tài khoản chưa hoạt động trong bản phát hành vì địa chỉ máy chủ để trống (xem bên dưới).

## Số máy tính cho mỗi khoá

- Khoá ngoại tuyến (`MIKM2…`, `MIKM1…`) mang mã máy `mc` và chỉ dùng được trên đúng một máy tính. Khoá không có `mc` dùng được mọi máy.
- `max` trong khoá là số máy chiếu tối đa, không phải số máy tính.
- Chuyển khoá sang máy khác: người dùng bấm **GỠ KEY**, nhận mã gỡ, gửi cho người cấp cùng mã máy mới để được cấp khoá mới. Khoá cũ không bị thu hồi từ xa nếu không có địa chỉ kiểm tra thu hồi.

TODO(owner): Chính sách số máy tính cho mỗi giấy phép Pro mua trên website là bao nhiêu (một, hai, …)? Với khoá ngoại tuyến hiện là một.

## Hành vi của app

Thứ tự áp dụng (theo `docs/license-contract.md` §2 và `server/src/license.ts`):

1. Khoá ngoại tuyến hợp lệ cho máy này, còn hạn, chưa bị thu hồi: Pro.
2. Tài khoản đã đăng nhập, `get_entitlement(mã máy)`: `paid` (thuê bao còn hạn, hoặc vĩnh viễn nếu `BUILD_DATE` ≤ `updates_until`) và `trial`: Pro; `expired`, `other_machine`, `machine_used`, `none`: Free.
3. Còn lại: Free, trang bản quyền hiện ra và bỏ qua được.

| Tình huống | Hành vi đã thực thi? |
|---|---|
| Hết hạn khoá (`exp`) | Có: về Free, trạng thái `expired` |
| Bản mới hơn `updates_until` (`outdated`) | Có: về Free, hiện màn báo gia hạn cập nhật hoặc cài bản cũ. Hai nút mở trang tải và trang cửa hàng chưa có |
| Mất mạng | Có, chỉ khi bản có cấu hình máy chủ: quyền đã xác nhận còn giá trị tối đa 30 ngày (`ONLINE_GRACE_DAYS`), sau đó `unverified` và về Free |
| Khoá bị thu hồi | Chỉ khi có địa chỉ kiểm tra thu hồi. `DEFAULT_LICENSE_CHECK_URL` đang rỗng nên **chưa thực thi** trong bản phát hành |
| Cảnh báo trước hạn | Có: nhắc từ 14 ngày trước |
| Gateway từ chối lệnh Pro khi Free | Có: mã lỗi HTTP 402 cho hình trực tiếp, đổi input, OSD, test pattern, độ sáng, RAW |

## Phần chưa thực thi hoặc lệch với hợp đồng

1. **Đồng hồ**: app so `BUILD_DATE` với `updates_until`, và tính hạn dùng thử, hạn thuê bao, hạn xác minh bằng đồng hồ máy tính (có cơ chế chống chỉnh đồng hồ lùi). Hàm `get_entitlement` trả `server_now` nhưng app chưa dùng. Yêu cầu của chủ sản phẩm là dùng giờ máy chủ.
2. **Địa chỉ máy chủ để trống**: `SUPABASE_URL` và `SUPABASE_ANON_KEY` trong `server/src/licenseKey.ts` đang rỗng, nên tài khoản, dùng thử 30 ngày, giấy phép vĩnh viễn qua tài khoản và key Free đều chưa hoạt động trong bản phát hành. Chỉ đặt URL công khai và khoá `anon`, không bao giờ đặt khoá service. Cũng có thể đặt bằng biến môi trường `MIKMASTER_SUPABASE_URL` và `MIKMASTER_SUPABASE_ANON_KEY`.
3. **Key Free (`MIKE-…`)**: app không có mã nhập và không gọi `activate_free_key`. Chờ chốt chính sách A (bắt buộc) hay B (tuỳ chọn) trong `docs/license-contract.md` §3.
4. **Ngày dựng**: `BUILD_DATE` lấy giờ lúc dựng, không phải giờ tạo bản phát hành. Workflow chưa đặt `MIKMASTER_BUILD_DATE`. Hợp đồng chấp nhận chênh vài phút.
5. **Khoá MIKM2 có `upd`**: chỉ cấp cho khách sau khi họ có app từ 0.6.0 (app 0.5.9 trở về trước từ chối cờ lạ).
6. **Tên secret**: workflow đồng bộ dùng secret `RELEASES_REPO_TOKEN`, quy ước chung là `RELEASES_TOKEN`.
7. **Thu hồi ngoại tuyến**: xem hàng "Khoá bị thu hồi" ở trên.

Giới hạn bản chất của khoá ngoại tuyến: ai sửa được mã app (thay khoá công khai, bỏ đoạn kiểm tra) hoặc xoá cả hai nơi lưu trạng thái rồi cài lại thì vượt được. Cách giảm rủi ro: ký số app, và kích hoạt qua máy chủ nếu cần chặt hơn.

## Quyết định cần ở chủ sản phẩm

TODO(owner): Chốt chính sách Free key (A hay B) để app bắt đầu gọi `activate_free_key`.

TODO(owner): Điền `SUPABASE_URL` và `SUPABASE_ANON_KEY` công khai của dự án dùng chung với website để bật tài khoản và dùng thử. Cần chạy `supabase/schema.sql` rồi các tệp `add-*.sql` của website trên dự án đó trước.

TODO(owner): Có muốn app dùng `server_now` do máy chủ trả về làm giờ chuẩn để so với `updates_until` không?

## Sản phẩm thứ hai có bán bản quyền

MikMaster là sản phẩm đầu tiên dùng hợp đồng này. Khi sản phẩm khác của bạn cũng bán bản quyền, đừng tạo bảng, khoá hay lược đồ mới và đừng sửa máy chủ. Hãy ghi yêu cầu của sản phẩm đó (số máy, thời hạn, cập nhật) vào `license.md` của nó và báo cho bạn quyết định.
