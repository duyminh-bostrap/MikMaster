---
title: Giám sát nhiệt độ, lỗi và trạng thái
slug: monitoring
---
MikMaster đọc trạng thái của mọi máy trong project khoảng bốn giây một lần khi nối với máy thật. Trang này mô tả các chỗ hiển thị kết quả.

## Trên thẻ máy chiếu

Mỗi thẻ có thanh trạng thái màu (bật, tắt, mất kết nối), chữ trạng thái nguồn, ảnh thu nhỏ, tên, model, input, giờ đèn và thanh nhiệt độ. Thẻ còn hiện nhãn cho các tình huống sau.

| Nhãn | Nghĩa |
|---|---|
| **MẤT KẾT NỐI** | Không liên lạc được với máy |
| **ĐĂNG NHẬP** | Máy cần đăng nhập |
| **GIAO THỨC** | Máy trả lời nhưng không theo giao thức đã chọn |
| **SHUTTER** | Shutter đang đóng |
| **PATTERN** | Test pattern đang bật |
| Nhãn nhiệt độ có dấu cảnh báo | Nhiệt độ vượt 33°C; vượt 40°C thì đổi sang màu nguy hiểm |

## Thanh trên và cảnh báo

Thanh trên của bảng điều khiển ghi tên phạm vi đang xem, số máy, số cảnh báo và số máy đang kết nối. Biểu ngữ cảnh báo liệt kê các vấn đề đang có. Lỗi mới nhất của từng máy cũng hiện trên thẻ.

Khi một máy vượt 40°C, hộp thoại **NHIỆT ĐỘ CAO** hiện lên với danh sách máy và nhiệt độ. Chọn **MỞ** để tới trang của máy hoặc **ĐÃ BIẾT** để đóng.

Nút **LÀM MỚI** đọc ngay trạng thái của mọi máy. Kết quả ghi số máy đã trả lời, số máy không, và số máy cần đăng nhập.

## Chế độ xem Bảng điều khiển

Trong tab **Tất cả máy chiếu**, nút **Bảng điều khiển** ở đầu thanh lọc chuyển sang các bảng tổng hợp:

- **Tình trạng chung**: số máy bật, tắt và cần chú ý, số máy đang khởi động hay làm nguội.
- **Cảnh báo**: số cảnh báo đang có.
- **Nhiệt độ TB** và máy nóng nhất.
- **NHIỆT ĐỘ · BẬT / TẮT MÁY**: biểu đồ nhiệt độ của từng máy theo thời gian, cùng các biểu tượng bật, tắt và mất kết nối dưới trục thời gian. Chọn khoảng thời gian 5 phút, 15 phút, 1 giờ hoặc Tất cả. Mỗi máy có màu riêng, xem ở **MÀU CỦA TỪNG MÁY**.
- **ĐỘ SÁNG**: độ sáng của từng máy báo về.
- **THỜI GIAN TỪ LÚC BẬT MÁY**: mỗi máy đã bật bao lâu.
- **NHẬT KÝ & LỖI** và **LỖI ĐANG CÓ**: sự kiện của mọi máy, lọc theo **Cảnh báo + lỗi**, **Lỗi** hoặc **Mọi sự kiện**. **LƯU LOG TỔNG** lưu nhật ký của mọi máy thành một tệp.

MikMaster chỉ giữ lịch sử nhiệt độ và các lần bật, tắt trong phiên đang chạy; lịch sử đó không lưu vào project. Biểu đồ giữ tối đa 24 giờ gần nhất.

Máy không báo nhiệt độ, độ sáng hay giờ đèn không có số trong các bảng này; mỗi bảng ghi số máy không báo. Nhiệt độ cần máy đang bật.

### Dữ liệu mẫu

Nút **DÙNG DỮ LIỆU MẪU** đổ số liệu giả để bạn xem bố cục. Dữ liệu mẫu mang nhãn **DỮ LIỆU MẪU — không phải số đo thật** và không phản ánh máy của bạn. Bấm **TẮT DỮ LIỆU MẪU** để quay lại số đo thật.

## PING

Nút **PING** trên trang của máy kiểm tra mạng (ICMP) và cổng điều khiển. Giao thức UDP không kiểm tra được cổng và ghi **UDP — không kiểm tra**. Cần chạy MikMaster với gateway; ở chế độ mô phỏng, trình duyệt không tự ping được.

## Xem thêm

- [Xử lý sự cố](/store/mikmaster/docs/troubleshooting)
- [Tìm máy nhanh và sắp xếp theo group](/store/mikmaster/tutorial/find-and-organize)
