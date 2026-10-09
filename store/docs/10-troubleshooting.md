---
title: Xử lý sự cố
slug: troubleshooting
---
Mỗi mục dưới đây gồm triệu chứng, nguyên nhân thường gặp và cách xử lý. Với các sự cố kết nối, bắt đầu bằng nút **PING** trên trang của máy: kết quả của nó cho biết lỗi nằm ở mạng hay ở cổng điều khiển.

## Cài đặt và khởi động

### Windows báo "Windows protected your PC"

- **Nguyên nhân**: bộ cài chưa được ký số.
- **Cách xử lý**: chọn **More info**, rồi **Run anyway**. Xem [Cài đặt và chạy lần đầu](/store/mikmaster/tutorial/install-first-run).

### macOS không cho mở MikMaster

- **Nguyên nhân**: bộ cài và ứng dụng chưa được Apple công chứng.
- **Cách xử lý**: mở **System Settings**, chọn **Privacy & Security** rồi **Open Anyway**. Với macOS 14 trở về trước, chuột phải vào ứng dụng và chọn **Open**.

### MikMaster không thấy máy chiếu nào trên macOS

- **Nguyên nhân**: chưa cấp quyền **Local Network**.
- **Cách xử lý**: mở **System Settings**, **Privacy & Security**, **Local Network** và bật cho MikMaster. Khởi động lại MikMaster.

### Báo cổng 8787 đang được dùng

- **Nguyên nhân**: MikMaster đã chạy sẵn, hoặc chương trình khác chiếm cổng.
- **Cách xử lý**: nếu MikMaster đã chạy, bấm đúp ứng dụng lần nữa chỉ mở lại trình duyệt. Nếu cổng bị chương trình khác dùng, đặt biến môi trường `PORT` sang số khác trước khi chạy.

### Safari không mở được giao diện

- **Nguyên nhân**: Safari không nhận địa chỉ `mikmaster.localhost`.
- **Cách xử lý**: mở `http://127.0.0.1:8787`, hoặc dùng Chrome, Edge hay Firefox. Lưu ý cài đặt được lưu theo địa chỉ truy cập.

### Chân trang ghi MÔ PHỎNG · KHÔNG CÓ GATEWAY

- **Nguyên nhân**: giao diện không nối được với gateway, nên MikMaster chỉ chạy mô phỏng và không điều khiển máy thật.
- **Cách xử lý**: đảm bảo ứng dụng MikMaster (cửa sổ đen trên Windows, tiến trình nền trên macOS) đang chạy, rồi mở giao diện bằng địa chỉ MikMaster in ra. Bấm nút tìm lại gateway ở chân trang.

### Chân trang ghi GATEWAY KHOÁ · NHẬP TOKEN

- **Nguyên nhân**: gateway được mở cho máy khác trong mạng và yêu cầu token.
- **Cách xử lý**: chọn **NHẬP TOKEN** và nhập token in ra cửa sổ gateway khi nó khởi động. Xem [Dữ liệu và quyền riêng tư](/store/mikmaster/docs/data-and-privacy).

## Quét và kết nối máy chiếu

### Quét không tìm thấy máy nào

- **Nguyên nhân**: dải IP sai, máy tính và máy chiếu khác mạng, tường lửa chặn, hoặc máy chặn ping.
- **Cách xử lý**: kiểm tra dải ở **Quét từ** và **Quét đến** có chứa địa chỉ của máy chiếu, rồi chọn **QUÉT LẠI**. Nếu máy ở dải khác, thêm bằng **THÊM TAY**.

### Báo "Chỉ quét được địa chỉ mạng nội bộ"

- **Nguyên nhân**: dải bạn nhập nằm ngoài 10.x, 172.16 đến 172.31, 192.168.x và 127.x.
- **Cách xử lý**: nhập dải nội bộ.

### Thẻ ghi MẤT KẾT NỐI

- **Nguyên nhân**: máy tắt nguồn điện, sai địa chỉ IP, cáp mạng, hoặc máy ở dải khác.
- **Cách xử lý**: mở trang của máy, chọn **PING** và đọc kết quả theo bảng dưới, rồi chọn **KẾT NỐI LẠI**.

| Kết quả PING | Nghĩa | Việc cần làm |
|---|---|---|
| **Kết nối được** | Mạng và cổng điều khiển đều tốt | Kiểm tra giao thức và tài khoản |
| **Cổng điều khiển mở (máy không trả lời ping)** | Máy chặn ping nhưng điều khiển được | Không cần làm gì thêm |
| **Có trên mạng nhưng cổng điều khiển đang đóng** | Máy bật nhưng dịch vụ điều khiển tắt hoặc sai cổng | Bật điều khiển qua mạng trên máy; kiểm tra cổng |
| **Không phản hồi — kiểm tra IP, cáp, nguồn** | Không tới được máy | Kiểm tra IP, cáp mạng, nguồn điện |

### Thẻ ghi LỖI GIAO THỨC

- **Nguyên nhân**: thiết bị có trả lời nhưng không theo giao thức đã chọn.
- **Cách xử lý**: mở **MẠNG / GIAO THỨC** trên trang máy và chọn đúng giao thức, hoặc nhập lại IP để MikMaster dò lại.

### Hiện CẦN ĐĂNG NHẬP hoặc "Sai tên đăng nhập hoặc mật khẩu"

- **Nguyên nhân**: máy có mật khẩu, hoặc tài khoản không đúng.
- **Cách xử lý**: bấm **ĐĂNG NHẬP** ở góc trên bên phải và nhập tài khoản của máy. Mặc định MikMaster điền `admin` / `admin`; hãy dùng tài khoản thật nếu bạn đã đổi.

### Thông báo "Không kết nối được" kèm địa chỉ IP khi đăng nhập

- **Nguyên nhân**: đây là lỗi mạng, không phải lỗi mật khẩu.
- **Cách xử lý**: dùng **PING** để kiểm tra IP, cáp và nguồn.

## Điều khiển

### Nút bị mờ hoặc báo tính năng Pro

- **Nguyên nhân**: bản Free chỉ bật tắt máy và shutter.
- **Cách xử lý**: xem [Bản Free, Pro và bản quyền](/store/mikmaster/docs/editions-and-licensing).

### Nút bị mờ dù đã có Pro

- **Nguyên nhân**: giao thức hoặc model đó chưa có lệnh cho chức năng này.
- **Cách xử lý**: xem bảng chức năng ở [Giao thức và dòng máy được hỗ trợ](/store/mikmaster/docs/supported-projectors). Có thể khai báo lệnh riêng ở [Lệnh nâng cao](/store/mikmaster/docs/advanced-commands) và thử bằng **RAW COMMAND**.

### Bật tất cả nhưng các máy bật chậm hơn mong đợi

- **Nguyên nhân**: **KHOẢNG CÁCH GIỮA CÁC LẦN BẬT MÁY** đang lớn hơn 0.
- **Cách xử lý**: giảm hoặc đặt 0 ở **Cài đặt**. Xem [Cài đặt](/store/mikmaster/docs/settings).

### Hình trực tiếp không hiện

- **Nguyên nhân**: máy không nhận tín hiệu, nội dung có HDCP, máy đang tắt, hoặc cần tài khoản web.
- **Cách xử lý**: đọc thông báo thay cho hình trong mục **HÌNH TRỰC TIẾP** và làm theo [Trang máy chiếu](/store/mikmaster/docs/projector-page). Máy Christie cần đăng nhập **TÀI KHOẢN WEB**.

### Test pattern không hiện khi bấm

- **Nguyên nhân**: máy đang tắt, shutter đang đóng, hoặc mẫu đó máy không có.
- **Cách xử lý**: bật máy, mở shutter, hoặc chọn mẫu khác.

## Bản quyền

### Hiện BẢN NÀY MỚI HƠN THỜI HẠN CẬP NHẬT CỦA BẠN

- **Nguyên nhân**: giấy phép vĩnh viễn của bạn có thời hạn cập nhật và bản này phát hành sau thời hạn đó.
- **Cách xử lý**: cài bản phát hành trước ngày **Cập nhật đến**, hoặc gia hạn cập nhật. Xem [Bản Free, Pro và bản quyền](/store/mikmaster/docs/editions-and-licensing).

### Hiện HÃY KẾT NỐI MẠNG ĐỂ XÁC MINH BẢN QUYỀN

- **Nguyên nhân**: đã hơn 30 ngày chưa xác minh được bản quyền qua mạng.
- **Cách xử lý**: nối máy tính với internet và chọn **KIỂM TRA NGAY** trong **Cài đặt**.

### Khoá không được chấp nhận

- **Nguyên nhân**: khoá gắn với mã máy khác, đã hết hạn, hoặc nhập sai.
- **Cách xử lý**: so mã máy trong **Cài đặt** với mã bạn đã gửi cho người cấp bản quyền, và nhập lại khoá đầy đủ.

## Lấy thêm thông tin

- Nhật ký sự kiện của từng máy ở thẻ **NHẬT KÝ** trong khay **TERMINAL**; nút **LƯU LOG** lưu thành tệp.
- Trên macOS, nhật ký của ứng dụng ở `~/Library/Logs/MikMaster.log`.

TODO(owner): Kênh hỗ trợ nào bạn muốn khách dùng khi gặp lỗi (email, form, kênh chat)? Thêm vào cuối trang này.
