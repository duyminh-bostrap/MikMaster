---
title: Điều khiển riêng một máy chiếu
slug: control-one-projector
---
Bài này hướng dẫn mở trang của một máy chiếu, đăng nhập vào máy, xem hình trực tiếp, đổi input, hiện test pattern, chỉnh độ sáng và kiểm tra kết nối. Các phần xem hình, input, test pattern, độ sáng và OSD cần bản Pro; bản Free chỉ bật tắt máy và shutter. Mỗi dòng máy hỗ trợ một số chức năng khác nhau, nên nút nào không dùng được sẽ mờ đi. Bảng đầy đủ nằm ở [Giao thức và dòng máy được hỗ trợ](/store/mikmaster/docs/supported-projectors).

## Mở trang của máy

1. Ở bảng điều khiển, bấm vào thẻ của máy chiếu. Rê chuột vào thẻ sẽ hiện **MỞ ĐIỀU KHIỂN →**.
2. Thanh trên cùng ghi đường dẫn **tên project / group / tên máy**, trạng thái nguồn, nhiệt độ và địa chỉ IP của máy. Bấm tên project để quay lại bảng điều khiển.

![Trang của một máy chiếu](TODO-upload:projector-page.png)

Cột trái có nguồn (**NGUỒN**), **SHUTTER / CHE HÌNH**, **OSD**, **MẠNG / GIAO THỨC** và **TRẠNG THÁI**. Giữa là **HÌNH TRỰC TIẾP**, **NGUỒN VÀO (INPUT)** và **TEST PATTERN**. Cột phải là lens và **ĐỘ SÁNG**. Các nút lens bị khoá khi MikMaster nối với máy thật, vì chưa có bộ lệnh lens đối chiếu với tài liệu của hãng.

## Đăng nhập vào máy

Nếu hộp cam **CẦN ĐĂNG NHẬP** hiện ở cột trái, máy có mật khẩu và các nút điều khiển đang ẩn.

1. Chọn **ĐĂNG NHẬP**, hoặc nút vàng ở góc trên bên phải.
2. Nhập **TÊN ĐĂNG NHẬP** và **MẬT KHẨU** của máy.
3. Tick ô **Dùng luôn cho N máy khác cần đăng nhập** nếu muốn áp tài khoản này cho các máy khác.
4. Chọn **ĐĂNG NHẬP**.

Nếu đăng nhập đúng, hộp cam biến mất và các nút điều khiển hiện ra. Nếu sai, bạn thấy **Sai tên đăng nhập hoặc mật khẩu.** Nếu máy không trả lời, bạn thấy thông báo **Không kết nối được** kèm địa chỉ IP: đó là lỗi mạng, không phải lỗi mật khẩu.

Muốn đăng xuất hoặc đổi tài khoản sau, bấm tên tài khoản ở góc trên bên phải. Khung hiện dòng **Đã đăng nhập** kèm tên và nút **ĐĂNG XUẤT**; đăng xuất xong, bạn nhập lại tài khoản khác.

## Xem hình trực tiếp

Mục **HÌNH TRỰC TIẾP** ở giữa trang hiện ảnh tín hiệu máy đang nhận.

1. Chờ vài giây để hình xuất hiện. Hình tự làm mới.
2. Nếu bạn thấy **Không có tín hiệu ở** kèm tên input, máy đang không nhận tín hiệu ở input đó.
3. Nếu bạn thấy **Đăng nhập tài khoản web của máy (góc trên bên phải) để xem hình trực tiếp**, nhập **TÀI KHOẢN WEB** trong khung đăng nhập. Tài khoản này chỉ dùng để xem hình; điều khiển không cần nó.
4. Nếu máy đang tắt, không gửi hình và có hỗ trợ, mục này hiện nút **PRE-SHOW MODE** để xem hình mà không chiếu. Chế độ này đổi một cài đặt trên máy trong lúc bạn xem, và MikMaster đặt lại khi bạn thôi xem.

## Đổi input

1. Ở mục **NGUỒN VÀO (INPUT)**, bấm tên cổng, ví dụ **HDMI 1** hay **SDI 1**.
2. Nút của input đang dùng được tô sáng.

## Hiện test pattern

1. Bật máy trước. Khi máy tắt, các nút test pattern bị mờ.
2. Ở mục **TEST PATTERN**, bấm một mẫu như **Grid** hoặc **Color Bars**. Mẫu đó hiện ngay trên máy và nút ở trên đổi thành **BẬT PATTERN**.
3. Muốn tắt, bấm nút **BẬT PATTERN** để chuyển sang **TẮT PATTERN**.

Mẫu nào máy không có lệnh thì mờ đi. Nếu shutter đang đóng, trang báo **Shutter đang đóng — pattern bị che**: mở shutter để thấy mẫu.

## Chỉnh độ sáng

1. Bật máy. Khi máy tắt, mục **ĐỘ SÁNG** bị mờ.
2. Kéo thanh trượt, hoặc bấm nút trừ và nút cộng, hoặc chọn một mức nhanh. Lệnh chỉ gửi tới máy khi bạn thả thanh trượt.

## Kiểm tra kết nối bằng PING

Khi một máy không phản hồi, dùng nút **PING** ở mục **TRẠNG THÁI**.

1. Bấm **PING**.
2. Đọc kết quả: **Kết nối được**, **Cổng điều khiển mở (máy không trả lời ping)**, **Có trên mạng nhưng cổng điều khiển đang đóng**, hoặc **Không phản hồi — kiểm tra IP, cáp, nguồn**.

Bước tiếp theo cho từng kết quả nằm ở [Xử lý sự cố](/store/mikmaster/docs/troubleshooting).

## Gửi một lệnh thô

Thẻ **RAW COMMAND** gửi nguyên văn lệnh bạn gõ tới máy, dùng khi bạn cần đối chiếu lệnh trong tài liệu của hãng. Thẻ này thuộc bản Pro.

1. Bấm nút **TERMINAL** ở đáy trang, hoặc nhấn Ctrl+\`, để mở khay.
2. Chọn thẻ **RAW COMMAND**.
3. Gõ lệnh của hãng rồi nhấn Enter hoặc chọn **GỬI**.
4. Đọc phản hồi hiện trong khung ngay phía trên.

Thẻ **NHẬT KÝ** cạnh đó ghi lại các sự kiện của máy.
