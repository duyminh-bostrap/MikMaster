# MikMaster — Tài khoản và dùng thử 30 ngày (Supabase)

Khi đã cấu hình Supabase, mở app phải **đăng nhập tài khoản** (hoặc **tạo tài khoản Free 30 ngày**), hoặc **nhập key offline**.
Chưa cấu hình (mặc định) thì app chạy như trước: dùng thử 30 ngày cục bộ + khoá license.

## Quy tắc

| Tình huống | Kết quả |
|---|---|
| Tạo tài khoản mới, đăng nhập lần đầu trên một máy | Free **30 ngày** trên máy đó |
| Tạo tài khoản **khác** trên cùng máy đó | **Không** có thêm 30 ngày ("máy này đã dùng thử") |
| Cùng tài khoản đăng nhập ở máy khác | **Không** có thêm ("tài khoản đã dùng thử ở máy khác") |
| Có key offline (gắn với mã máy) | Vào được, không cần tài khoản |
| Tài khoản có gói trả phí (`entitlements`) | Dùng được trên mọi máy của tài khoản |
| Mất mạng | Quyền dùng đã xác nhận còn giá trị tối đa **30 ngày**; quá hạn thì phải kết nối mạng để xác nhận lại |

Mã máy hiện trong Cài đặt → Bản quyền (băm một chiều của định danh phần cứng). Máy chủ ghi nhận theo mã này.

## Thiết lập Supabase (một lần)

1. Vào https://supabase.com → **New project** (gói Free đủ dùng). Ghi nhớ mật khẩu database.
2. **SQL Editor** → dán toàn bộ [`supabase/schema.sql`](../supabase/schema.sql) → **Run**. Tạo bảng `trials`, `entitlements`, hai hàm `claim_trial`, `get_entitlement`, và bật Row Level Security.
3. **Project Settings → API**: chép **Project URL** và khoá **anon public**.
4. Điền vào app, một trong hai cách:
   - sửa `SUPABASE_URL` và `SUPABASE_ANON_KEY` trong [`server/src/licenseKey.ts`](../server/src/licenseKey.ts) rồi build lại; hoặc
   - đặt biến môi trường `MIKMASTER_SUPABASE_URL`, `MIKMASTER_SUPABASE_ANON_KEY` khi chạy gateway.
   Khoá `anon` là công khai theo thiết kế của Supabase (bảo vệ bằng RLS), khác hoàn toàn khoá `service_role` — **không bao giờ** đưa khoá `service_role` vào app hay vào repo.
5. **Authentication → Providers → Email**: nên **bật "Confirm email"** (tránh đăng ký hàng loạt bằng email giả). Người dùng xác nhận email rồi mới đăng nhập được. Tuỳ chọn: thiết lập SMTP riêng (mặc định Supabase giới hạn số email gửi mỗi giờ).
6. **Authentication → Rate limits**: giữ mặc định hoặc siết lại để hạn chế thử mật khẩu.

## Cấp gói trả phí

Trong SQL Editor (xem cuối `schema.sql`):

```sql
insert into public.entitlements (user_id, paid_until, note)
select id, now() + interval '365 days', 'Cong ty ABC' from auth.users where email = 'khach@example.com'
on conflict (user_id) do update set paid_until = excluded.paid_until, note = excluded.note;
```

## Bảo mật và giới hạn

- Mật khẩu chỉ đi từ giao diện qua gateway (localhost) tới Supabase; gateway **không lưu, không ghi log** mật khẩu. Ở máy chỉ lưu email + refresh token, mã hoá AES-256-GCM (khoá suy ra từ mã máy) trong `account.dat`; chép file sang máy khác không dùng được.
- Việc quyết định 30 ngày nằm ở **máy chủ** (hàm SQL), không phải ở máy khách: xoá file, đổi tài khoản, chỉnh đồng hồ máy đều không thêm được thời gian.
- **Không thể ngăn hoàn toàn:** mã máy do app gửi lên, nên người biết vá app có thể giả mã máy khác để nhận thêm dùng thử. Muốn chặt hơn cần thêm bước xác minh phần cứng phía máy chủ hoặc ký số app.
- Kiểm tra qua mạng mỗi 6 giờ khi app đang chạy và mỗi lần đăng nhập; nút **Kiểm tra ngay** ở Cài đặt → Bản quyền.
