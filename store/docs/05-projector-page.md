---
title: Trang máy chiếu
slug: projector-page
---
Bấm vào thẻ của một máy để mở trang riêng của nó. Trang này mô tả từng mục trên trang. Các mục có ghi chú Pro cần bản Pro; xem [Bản Free, Pro và bản quyền](/store/mikmaster/docs/editions-and-licensing).

## Bố cục

- Thanh trên cùng: đường dẫn project, group và tên máy, trạng thái nguồn, nhiệt độ, địa chỉ IP và nút đăng nhập máy. Bấm tên máy để sửa thông tin.
- Cột trái: **NGUỒN**, **SHUTTER / CHE HÌNH**, **OSD**, **MẠNG / GIAO THỨC** và **TRẠNG THÁI**.
- Giữa: **HÌNH TRỰC TIẾP**, **NGUỒN VÀO (INPUT)** và **TEST PATTERN**.
- Cột phải: lens và **ĐỘ SÁNG**.
- Đáy trang: khay **TERMINAL**.

## Đăng nhập máy

Máy có mật khẩu hiện hộp **CẦN ĐĂNG NHẬP** và ẩn các nút điều khiển cho tới khi đăng nhập được. Khung đăng nhập ở góc trên bên phải có ô **Dùng luôn cho N máy khác cần đăng nhập** và ô **Lưu làm đăng nhập nhanh** để dùng lại tài khoản cho mọi máy cùng hãng (Panasonic, Christie, Barco).

Với Christie Griffyn, mục **TÀI KHOẢN WEB** chỉ dùng cho hình trực tiếp và điều khiển không cần nó.

## Hình trực tiếp (Pro)

Hiện ảnh tín hiệu máy đang nhận, làm mới tự động. Các thông báo thường gặp:

| Thông báo | Nghĩa |
|---|---|
| **Không có tín hiệu ở** kèm tên input | Máy không nhận tín hiệu ở input đó |
| **Nội dung được bảo vệ HDCP** | Máy không cho xem trước nội dung có HDCP |
| **Máy không có ảnh xem trước cho input này** | Input này không có ảnh xem trước |
| **Không lấy được hình trực tiếp** | Có lỗi khi lấy ảnh; thông báo kèm nguyên nhân |

Máy Panasonic hỗ trợ **PRE-SHOW MODE** để xem hình khi máy đang tắt. Chế độ này đổi cài đặt Pre-Show trên chính máy trong lúc bạn xem và MikMaster đặt lại khi bạn thôi xem.

## Input (Pro)

Danh sách nút input; nút của input đang dùng được tô sáng. Nút bị mờ khi máy hoặc giao thức không hỗ trợ đổi input.

## OSD (Pro)

Cặp nút **BẬT** và **TẮT** hiện hoặc ẩn menu trên màn hình của máy. MikMaster gửi lệnh OSD thật tới máy Christie. Với dòng máy khác chưa có lệnh OSD đã xác minh, nút có thể chỉ đổi trạng thái hiển thị trong ứng dụng mà không đổi gì trên máy. Xem [Giao thức và dòng máy được hỗ trợ](/store/mikmaster/docs/supported-projectors).

## Test pattern (Pro)

Nút **BẬT PATTERN** hoặc **TẮT PATTERN** bật tắt mẫu; các ô nhỏ bên dưới chọn mẫu. Cần máy đang bật. Shutter đang đóng thì mẫu bị che và trang báo **Shutter đang đóng — pattern bị che**. Đóng shutter không tắt mẫu.

## Độ sáng (Pro)

Thanh trượt 0 đến 100%, nút trừ, nút cộng (bước 5%) và bốn mức nhanh 25, 50, 75 và 100%. Lệnh chỉ gửi khi bạn thả thanh trượt. Cần máy đang bật. Chỉ Panasonic có lệnh độ sáng đã tích hợp; trang báo rõ khi máy không có.

## Lens

Các nút lens (shift ngang, shift dọc, zoom, focus, preset) bị khoá khi MikMaster nối với máy thật, vì chưa có bộ lệnh lens được đối chiếu với tài liệu hãng. Với Christie Griffyn, ô **VỊ TRÍ LENS (MÁY BÁO)** chỉ đọc vị trí lens theo đơn vị của máy.

## Mạng và giao thức

Mục **MẠNG / GIAO THỨC** đổi địa chỉ IP, cổng, giao thức và tài khoản của máy. Với giao thức chung, nhập lệnh bật, tắt, đóng, mở shutter ở đây; xem [Lệnh nâng cao](/store/mikmaster/docs/advanced-commands).

## Trạng thái

Mục **TRẠNG THÁI** hiện kết nối (**ĐÃ KẾT NỐI**, **MẤT KẾT NỐI**, **LỖI GIAO THỨC**, **CẦN ĐĂNG NHẬP**), giờ đèn, nhiệt độ, độ sáng và nhật ký sự kiện. Khi máy mất kết nối, nút **KẾT NỐI LẠI** hiện ra và đọc ngay trạng thái thật của máy. Nút **PING** kiểm tra mạng (ICMP) và cổng điều khiển.

## Terminal

Nút **TERMINAL** hoặc Ctrl+\` mở khay có hai thẻ. **NHẬT KÝ** ghi sự kiện của máy, kèm nút **LƯU LOG** để lưu thành tệp. **RAW COMMAND** (Pro) gửi nguyên văn lệnh bạn gõ và hiện phản hồi.

## Xem thêm

- [Điều khiển riêng một máy chiếu](/store/mikmaster/tutorial/control-one-projector)
- [Lệnh nâng cao](/store/mikmaster/docs/advanced-commands)
