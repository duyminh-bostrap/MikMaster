---
title: Câu hỏi thường gặp
slug: faq
---
## MikMaster có cần internet không?

Không để điều khiển máy chiếu. Internet chỉ cần cho kiểm tra bản quyền qua mạng, khi bản MikMaster của bạn được cấu hình với máy chủ tài khoản. Xem [Dữ liệu và quyền riêng tư](/store/mikmaster/docs/data-and-privacy).

## MikMaster có chạy trên Linux hay Mac Intel không?

Không có bản phát hành cho hai nền tảng này. Các bản cài hiện có là Windows 64-bit và macOS Apple Silicon. Xem [Yêu cầu hệ thống](/store/mikmaster/docs/system-requirements).

## Tôi cần Node.js hay công cụ nào khác không?

Không. Ứng dụng đã chứa sẵn mọi thứ.

## Có thể điều khiển máy chiếu ở mạng khác không?

Không trực tiếp. Máy tính chạy MikMaster cần ở cùng mạng với máy chiếu, và MikMaster chỉ làm việc với địa chỉ IPv4 nội bộ.

## Hai người dùng cùng lúc được không?

Có. Mở gateway ra mạng bằng `HOST=0.0.0.0` và dùng token để máy tính khác trong mạng cũng điều khiển được. Xem [Dữ liệu và quyền riêng tư](/store/mikmaster/docs/data-and-privacy).

## Dòng máy nào đã được kiểm?

Panasonic PT-RQ35K và Christie Griffyn 4K50-RGB đã được thử bằng lệnh hỏi. Phần ghi lệnh vẫn viết theo tài liệu và chưa xác nhận trên máy thật. Xem [Giao thức và dòng máy được hỗ trợ](/store/mikmaster/docs/supported-projectors).

## Tại sao điều khiển lens bị khoá?

Chưa có bộ lệnh lens được đối chiếu với tài liệu chính thức của hãng, nên MikMaster khoá các nút lens khi nối với máy thật thay vì gửi lệnh chưa kiểm.

## Bật lần lượt dùng để làm gì?

Khi nhiều máy chiếu khởi động cùng lúc, dòng khởi động cộng dồn có thể làm nhảy aptomat. MikMaster bật từng máy cách nhau vài giây để tránh. Xem [Nguồn và shutter](/store/mikmaster/docs/power-and-shutter).

## Mật khẩu máy chiếu của tôi được lưu thế nào?

Mật khẩu được mã hoá trên đĩa của máy tính chạy MikMaster và không có trong tệp project xuất ra. Xem [Dữ liệu và quyền riêng tư](/store/mikmaster/docs/data-and-privacy).

## Tôi có chuyển bản quyền sang máy khác được không?

Có, bằng cách gỡ khoá khỏi máy cũ và xin khoá mới cho mã máy mới. Xem [Bản Free, Pro và bản quyền](/store/mikmaster/docs/editions-and-licensing).

## Tôi cập nhật MikMaster thế nào?

Chạy bộ cài của bản mới. Bộ cài tự tắt MikMaster đang chạy. Dữ liệu và project được giữ nguyên.

## Tôi gỡ MikMaster thế nào?

Trên Windows: **Settings**, **Apps**, **MikMaster**, **Uninstall**. Thư mục dữ liệu không bị xoá; xoá tay nếu muốn xoá hết.

TODO(owner): Cách gỡ trên macOS cho bản cài bằng `.pkg` là gì (kéo ứng dụng khỏi Applications có đủ không)? Kho mã không ghi.

## Tôi liên hệ ai khi cần hỗ trợ?

TODO(owner): Kênh hỗ trợ và thời gian phản hồi bạn muốn công bố là gì?
