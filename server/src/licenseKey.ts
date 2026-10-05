/**
 * Khoá CÔNG KHAI dùng để kiểm license (Ed25519, SPKI DER, base64). Khoá bí mật KHÔNG nằm trong repo:
 * `node scripts/license.mjs` giữ nó ở ~/.mikmaster-license/private.pem trên máy người phát hành.
 */
export const LICENSE_PUBLIC_KEY = 'MCowBQYDK2VwAyEAGStFTv0djt5vW1LuRWPUvyMtUF1xFhPn/Y63ru01dM8='

/**
 * Địa chỉ file trạng thái bản quyền đã ký (danh sách khoá bị thu hồi), app tải về để xác nhận còn hiệu lực.
 * Đặt qua biến môi trường MIKMASTER_LICENSE_URL hoặc điền ở đây. Để trống = tắt kiểm tra qua mạng
 * (khoá vẫn kiểm chữ ký offline). Xem `node scripts/license.mjs status`.
 */
export const DEFAULT_LICENSE_CHECK_URL = ''

/**
 * Máy chủ tài khoản (Supabase): URL project và khoá `anon` (công khai theo thiết kế của Supabase, bảo vệ bằng Row Level Security).
 * Điền ở đây hoặc đặt biến môi trường MIKMASTER_SUPABASE_URL / MIKMASTER_SUPABASE_ANON_KEY. Để trống = tắt hệ thống tài khoản
 * (không có dùng thử cục bộ: app chạy bản Free cho tới khi nhập khoá license). Xem docs/accounts.md.
 */
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''
