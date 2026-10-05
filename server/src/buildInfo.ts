/**
 * Ngày phát hành của bản build này (ISO). Bản quyền kiểu "dùng vĩnh viễn + cập nhật đến ngày X": khoá chỉ mở được các bản
 * phát hành TRƯỚC HOẶC TRONG ngày X. Ngày này được ghi lúc đóng gói (scripts/build-exe.mjs → esbuild define), khi chạy từ mã nguồn
 * lấy biến môi trường MIKMASTER_BUILD_DATE hoặc "bây giờ".
 */
declare const __MIKMASTER_BUILD_DATE__: string | undefined

export const BUILD_DATE: string =
  (typeof __MIKMASTER_BUILD_DATE__ !== 'undefined' ? __MIKMASTER_BUILD_DATE__ : undefined) ?? process.env.MIKMASTER_BUILD_DATE ?? new Date().toISOString()
