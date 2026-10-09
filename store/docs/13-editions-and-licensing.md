---
title: Bản Free, Pro và bản quyền
slug: editions-and-licensing
---
MikMaster có hai bản. Trang này mô tả mỗi bản làm được gì, cách bản quyền hoạt động và điều gì xảy ra khi bản quyền hết hạn hay không xác minh được.

## So sánh

| Chức năng | Free | Pro |
|---|---|---|
| Quét mạng, thêm máy, project, group | Có | Có |
| Bật, tắt máy | Có | Có |
| Đóng, mở shutter | Có | Có |
| Bật lần lượt, giám sát nhiệt độ và trạng thái | Có | Có |
| Hình trực tiếp từ máy chiếu | Không | Có |
| Đổi input | Không | Có |
| OSD | Không | Có |
| Test pattern | Không | Có |
| Chỉnh độ sáng | Không | Có |
| RAW COMMAND | Không | Có |

Các chức năng Pro bị khoá ở cả giao diện lẫn gateway: gateway từ chối lệnh Pro khi bản quyền chưa hợp lệ.

TODO(owner): Có giới hạn số máy chiếu ở bản Free không? Kho mã mô tả số máy tối đa là 3 trong thông điệp khởi động của gateway, nhưng API báo bản Free không giới hạn số máy; hai chỗ mâu thuẫn nhau và cần bạn xác nhận.

## Cách có bản Pro

Có hai đường, tuỳ bản MikMaster của bạn được cấu hình thế nào.

### Khoá bản quyền ngoại tuyến

1. Mở **Cài đặt** và tìm phần **BẢN QUYỀN**.
2. Sao chép **Mã máy** của máy tính này và gửi cho người cấp bản quyền.
3. Dán khoá nhận được vào ô **Khoá bản quyền**, rồi chọn **KÍCH HOẠT**.

Khoá có dạng `MIKM2…` hoặc `MIKM1…`. MikMaster kiểm khoá ngay trên máy bằng chữ ký số, không cần internet. Một khoá gắn với một mã máy chỉ chạy trên máy đó. Khoá còn có thể giới hạn số máy chiếu, một ngày hết hạn và một ngày kết thúc cập nhật (xem bên dưới).

### Tài khoản và dùng thử 30 ngày

Khi bản MikMaster được cấu hình với máy chủ tài khoản, màn hình đầu hiện **ĐĂNG NHẬP HOẶC NHẬP KEY**. Bạn tạo tài khoản miễn phí để dùng thử Pro 30 ngày. Mỗi tài khoản và mỗi máy tính chỉ được một lần dùng thử. Giấy phép gắn với tài khoản có thể là thuê bao có hạn hoặc vĩnh viễn.

TODO(owner): Bản MikMaster phát hành hiện chưa điền địa chỉ máy chủ tài khoản, nên đường này chưa hoạt động với khách. Bạn muốn công bố thế nào, và bao giờ bật?

TODO(owner): Các gói bản quyền (tên gói, giá, thuê bao hay vĩnh viễn, số lượng máy tính cho mỗi khoá) là gì? Kho mã chỉ mô tả cơ chế, không có bảng giá.

## Bản quyền vĩnh viễn và thời hạn cập nhật

Một giấy phép vĩnh viễn kèm ngày **Cập nhật đến**. Bản MikMaster phát hành sau ngày đó không mở khoá Pro cho giấy phép này. Bản phát hành trước hoặc đúng ngày đó vẫn dùng được mãi. Khi gặp tình huống này, MikMaster hiện **BẢN NÀY MỚI HƠN THỜI HẠN CẬP NHẬT CỦA BẠN**: bạn cài một bản cũ hơn, hoặc gia hạn cập nhật. MikMaster so ngày ghi lúc dựng bản cài với ngày cập nhật của giấy phép.

Giấy phép còn hạn cập nhật hiện **CẬP NHẬT CÒN N NGÀY**.

## Điều gì xảy ra khi bản quyền không hợp lệ

| Tình huống | MikMaster làm gì |
|---|---|
| Chưa có bản quyền | Chạy ở bản Free; trang bản quyền hiện ra và bạn bỏ qua được bằng **TIẾP TỤC VỚI BẢN FREE** |
| Khoá hết hạn | Chuyển về Free, hiện **BẢN QUYỀN HẾT HẠN** |
| Hết 30 ngày dùng thử | Chuyển về Free, hiện **HẾT DÙNG THỬ** |
| Bản MikMaster mới hơn thời hạn cập nhật | Chuyển về Free, hiện **BẢN NÀY MỚI HƠN THỜI HẠN CẬP NHẬT CỦA BẠN** |
| Khoá bị thu hồi | Chuyển về Free, hiện **BẢN QUYỀN ĐÃ BỊ THU HỒI** (chỉ khi bản của bạn có địa chỉ kiểm tra thu hồi) |
| Quá 30 ngày chưa xác minh được qua mạng | Chuyển về Free cho tới khi kết nối lại, hiện **HÃY KẾT NỐI MẠNG ĐỂ XÁC MINH BẢN QUYỀN** |
| Mất mạng ngắn hạn | Không đổi: quyền đã xác nhận còn giá trị tối đa 30 ngày |

Từ 14 ngày trước hạn, MikMaster hiện nhắc **BẢN QUYỀN CÒN N NGÀY** hoặc **KẾT NỐI MẠNG TRONG N NGÀY ĐỂ XÁC MINH BẢN QUYỀN**.

## Chuyển bản quyền sang máy khác

1. Trên máy cũ, mở **Cài đặt** và chọn **GỠ KEY**, rồi xác nhận.
2. Sao chép **mã gỡ** hiện ra.
3. Gửi mã gỡ và **Mã máy** của máy mới cho người cấp bản quyền để nhận khoá mới.

## Giới hạn của việc kiểm tra bản quyền

Kiểm tra bản quyền là rào chắn cho người dùng bình thường, không chống được người cố tình sửa ứng dụng. Ngày hiện tại do MikMaster lấy từ đồng hồ của máy tính; có một cơ chế phát hiện đồng hồ bị chỉnh lùi, nhưng bản quyền không đối chiếu ngày với thời gian của máy chủ.

## Xem thêm

- [Cài đặt](/store/mikmaster/docs/settings)
- [Câu hỏi thường gặp](/store/mikmaster/docs/faq)
