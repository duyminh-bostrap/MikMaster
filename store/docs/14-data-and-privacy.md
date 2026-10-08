---
title: Dữ liệu và quyền riêng tư
slug: data-and-privacy
---
MikMaster chạy trên máy tính của bạn và nói chuyện với máy chiếu trong mạng nội bộ. Trang này liệt kê dữ liệu nào được lưu ở đâu và dữ liệu nào rời khỏi máy.

## Dữ liệu lưu trên máy

| Dữ liệu | Nơi lưu |
|---|---|
| Project (máy chiếu, group) | Thư mục dữ liệu của MikMaster, dạng tệp JSON |
| Mật khẩu máy chiếu | Cùng thư mục dữ liệu, mã hoá bằng khoá `secret.key` |
| Lệnh tự khai báo, trạng thái bản quyền, mã máy | Thư mục dữ liệu |
| Cài đặt (giao diện, ngôn ngữ, khoảng cách bật máy) | Bộ nhớ của trình duyệt |
| Tài khoản đăng nhập máy trong phiên | Bộ nhớ phiên của trình duyệt, mất khi đóng |

Thư mục dữ liệu:

| Hệ điều hành | Đường dẫn |
|---|---|
| Windows | `%APPDATA%\MikMaster` |
| macOS | `~/Library/Application Support/MikMaster` |

Thư mục này giữ nguyên khi bạn cập nhật hoặc gỡ MikMaster. Xoá tay thư mục nếu muốn xoá hết. Nếu bạn sao lưu, hãy sao lưu `projects` cùng `secret.key`: mất khoá thì phải nhập lại mật khẩu máy chiếu. Trên macOS, nhật ký ở `~/Library/Logs/MikMaster.log`.

## Tệp project xuất ra

Tệp `.mikmaster.json` không chứa mật khẩu máy chiếu. Nó giữ tên đăng nhập, địa chỉ IP và cấu hình group, nên hãy coi nó như thông tin mạng nội bộ khi gửi cho người khác.

## Dữ liệu rời khỏi máy

- **Máy chiếu**: MikMaster gửi lệnh tới địa chỉ IP bạn khai báo trong mạng nội bộ. MikMaster chỉ kết nối và ping tới địa chỉ IPv4 nội bộ, và HTTP API không theo chuyển hướng ra ngoài.
- **Máy chủ tài khoản và bản quyền**: chỉ khi bản MikMaster của bạn được cấu hình với máy chủ tài khoản. Khi đó địa chỉ email và mật khẩu bạn nhập khi đăng nhập được gửi tới máy chủ tài khoản, mật khẩu không được MikMaster lưu lại. Mã máy (một giá trị băm một chiều của định danh máy, không lộ định danh gốc) được gửi để kiểm tra quyền dùng.
- **Khoá ngoại tuyến**: kiểm tra hoàn toàn trên máy, không gửi gì đi.

MikMaster không gửi dữ liệu sử dụng hay thu thập số liệu phân tích.

TODO(owner): Xác nhận câu cuối là đúng cho mọi bản phát hành, và cho biết bạn có chính sách quyền riêng tư công khai nào để dẫn tới không. Kho mã không có thành phần thu thập số liệu.

TODO(owner): Máy chủ tài khoản đặt ở đâu (nhà cung cấp, khu vực) và dữ liệu tài khoản được giữ bao lâu? Cần để mô tả đúng cho khách.

## Truy cập từ máy khác trong mạng

Mặc định gateway chỉ nghe địa chỉ `127.0.0.1`, nên chỉ máy tính đang chạy MikMaster mở được giao diện. Nếu bạn đặt biến môi trường `HOST=0.0.0.0` để máy khác dùng chung, gateway bắt buộc dùng một token. Gateway in token ra cửa sổ khi khởi động; trên máy kia, mở `http://<địa chỉ IP máy chạy MikMaster>:8787/?token=<token>` một lần, trình duyệt sẽ nhớ token. Có thể đặt token cố định bằng biến `MIKMASTER_TOKEN`.

## Xem thêm

- [Project và group](/store/mikmaster/docs/projects-and-groups)
- [Bản Free, Pro và bản quyền](/store/mikmaster/docs/editions-and-licensing)
