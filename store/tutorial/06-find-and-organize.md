---
title: Tìm máy nhanh và sắp xếp theo group
slug: find-and-organize
---
Bài này hướng dẫn tìm máy chiếu trong một project lớn, lọc theo trạng thái, chia máy vào các group, đổi tên và gỡ máy. Bạn cần một project có vài máy chiếu.

## Tìm máy theo tên, IP hoặc model

1. Mở **Tất cả máy chiếu** ở thanh bên.
2. Nhấn phím `/` để đưa con trỏ vào ô tìm kiếm, hoặc bấm thẳng vào ô **Tìm tên, IP, model…** ở góc phải thanh lọc.
3. Gõ một phần tên, địa chỉ IP hoặc model. Danh sách thu hẹp ngay khi bạn gõ.
4. Muốn xoá bộ lọc, nhấn Esc hoặc bấm nút **Xoá tìm kiếm** bên phải ô.

![Ô tìm kiếm đang lọc danh sách máy chiếu](TODO-upload:search-filter.png)

Nếu không máy nào khớp, trang hiện **Không có máy chiếu nào khớp bộ lọc**.

## Lọc theo trạng thái

Ở bên trái ô tìm kiếm có các nút lọc kèm số máy: **Tất cả**, **Đang bật**, **Đang tắt**, **Cảnh báo** và **Mất kết nối**.

1. Bấm một nút để chỉ giữ lại các máy có trạng thái đó.
2. Bấm **Tất cả** để bỏ lọc.

Bộ lọc trạng thái và ô tìm kiếm dùng được cùng lúc.

## Xem theo group hoặc theo bảng theo dõi

Trong tab **Tất cả máy chiếu**, nhóm hai nút ở đầu thanh lọc chọn cách xem.

1. **Group**: các thẻ máy xếp theo group. Bấm dòng tiêu đề của group, ví dụ `GROUP 1 · 6 máy · 3 đang bật`, để thu gọn thành các ô nhỏ hoặc mở lại.
2. **Bảng điều khiển**: nút này mở chế độ xem tổng hợp, không phải cả màn hình chính. Nó gồm các bảng theo dõi nhiệt độ, thời gian từ lúc bật máy, nhật ký và lỗi của cả project.

![Chế độ Bảng điều khiển với biểu đồ nhiệt độ](TODO-upload:dashboard-monitor.png)

Nếu chưa có số đo, bảng ghi **Chưa có số đo — biểu đồ sẽ hiện khi các máy báo về (hoặc dùng dữ liệu mẫu)**. Nút **DÙNG DỮ LIỆU MẪU** đổ dữ liệu giả để bạn xem bảng trông thế nào; dữ liệu đó mang nhãn **DỮ LIỆU MẪU — không phải số đo thật** và không phải số đo của máy bạn.

## Thêm và đổi tên group

1. Ở cuối thanh bên, chọn **THÊM GROUP**, gõ tên và nhấn Enter.
2. Bấm đúp vào tên group ở thanh bên để đổi tên. Bấm đúp vào tên project ở đầu thanh bên để đổi tên project.
3. Muốn xoá group, rê chuột vào group và bấm nút **Xoá group**. Hộp thoại **XOÁ GROUP** cho bạn chọn nơi chuyển các máy của group đó sang trước khi xoá.

## Chuyển máy sang group khác

1. Kéo thẻ máy chiếu thả vào tên group ở thanh bên, hoặc
2. bấm chuột phải vào thẻ, rồi chọn group dưới mục **CHUYỂN SANG GROUP**.

## Sửa thông tin hoặc gỡ một máy

1. Bấm chuột phải vào thẻ máy.
2. Chọn **Sửa thông tin…** để đổi tên, group, địa chỉ IP hoặc cổng. Nếu IP và cổng trùng với máy khác, bạn thấy **Đã có máy chiếu khác dùng IP và cổng này.**
3. Chọn **Gỡ khỏi project…** để gỡ máy. Hộp thoại **GỠ MÁY CHIẾU** hỏi xác nhận. Bản thân máy chiếu không bị thay đổi.

## Thêm một máy mới bằng IP

1. Chọn **THÊM MÁY CHIẾU** ở thanh bên.
2. Nhập địa chỉ IP. MikMaster dò giao thức và hiện dòng **Tìm thấy** kèm model nếu máy trả lời.
3. Chọn lại giao thức nếu dò sai, rồi xác nhận bằng nút thêm máy trong hộp thoại.

Nhớ lưu project sau khi sắp xếp xong ([Lưu, mở lại và chuyển project sang máy khác](/store/mikmaster/tutorial/save-and-reopen)).
