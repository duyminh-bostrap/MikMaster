---
title: Bật, tắt máy và đóng mở shutter
slug: power-and-shutter
---
Bài này hướng dẫn bật và tắt máy chiếu theo từng máy hoặc theo cả group, đặt khoảng cách giữa các lần bật để tránh sụt điện, và đóng mở shutter. Bạn cần một project đã có máy chiếu ([Tạo project đầu tiên và quét máy chiếu](/store/mikmaster/tutorial/create-first-project)). Mọi thao tác trong bài đều dùng được ở bản Free.

## Bật hoặc tắt một máy

1. Ở bảng điều khiển, tìm thẻ của máy chiếu.
2. Dưới thẻ có ba nút biểu tượng: **Bật máy**, **Tắt máy** và **Đóng shutter**. Rê chuột vào nút để xem tên.
3. Bấm **Bật máy**. Chữ trạng thái ở góc trên bên phải thẻ chuyển sang **ĐANG KHỞI ĐỘNG** trong lúc máy khởi động, rồi sang **BẬT** khi máy xác nhận.
4. Muốn tắt, bấm **Tắt máy**, rồi chọn **TẮT** trong hộp thoại hỏi xác nhận. Chữ trạng thái chuyển sang **ĐANG LÀM NGUỘI** trong lúc máy hạ nhiệt.

Bạn cũng bật và tắt được từ trang của máy: bấm vào thẻ (rê chuột vào thẻ sẽ hiện **MỞ ĐIỀU KHIỂN →**), rồi dùng cặp nút **BẬT** và **TẮT** ở mục **NGUỒN**.

## Bật hoặc tắt cả group

1. Chọn **Tất cả máy chiếu** để điều khiển cả project, hoặc chọn một group ở thanh bên hoặc ở các tab.
2. Ở đầu trang có hai ô lớn. Ô xanh **BẬT MÁY** ghi số máy đang bật; ô bên cạnh **TẮT / CHỜ** ghi số máy đang tắt hoặc chờ.
3. Bấm ô **BẬT MÁY** để bật mọi máy trong phạm vi đang chọn.
4. Bấm ô **TẮT / CHỜ** rồi chọn **TẮT** trong hộp thoại xác nhận để tắt tất cả.

![Bảng điều khiển với hai ô BẬT MÁY và TẮT / CHỜ ở đầu trang](TODO-upload:dashboard-groups.png)

## Bật lần lượt để tránh sụt điện

Khi bật nhiều máy cùng lúc, dòng khởi động của các máy cộng dồn và có thể làm nhảy aptomat. MikMaster bật từng máy một, cách nhau một khoảng bạn chọn.

1. Bấm logo MikMaster ở góc trên bên trái, rồi chọn **Cài đặt…**.
2. Ở mục **KHOẢNG CÁCH GIỮA CÁC LẦN BẬT MÁY**, kéo thanh trượt hoặc nhập số giây vào ô bên phải. Giá trị từ 0 đến 60 giây.
3. Đọc dòng giải thích dưới thanh trượt để biết cách bật hiện tại. Với `5` giây, dòng đó ghi MikMaster bật lần lượt từng máy, cách nhau 5 giây. Với `0`, nó ghi bật tất cả máy cùng lúc.
4. Chọn **XONG**.

![Hộp thoại Cài đặt với thanh KHOẢNG CÁCH GIỮA CÁC LẦN BẬT MÁY](TODO-upload:settings-dialog.png)

Giá trị lưu trên máy tính này và không đi theo project. Khi cài lần đầu, giá trị là 5 giây.

Lần sau bạn bấm ô **BẬT MÁY** cho nhiều máy, một thẻ tiến trình hiện ở góc dưới bên phải, ví dụ **Đang bật 1/6**, kèm dòng **Tiếp: tên máy sau N giây**. Thanh xanh bên dưới cho biết đã bật được bao nhiêu phần.

![Thẻ tiến trình bật lần lượt với nút DỪNG](TODO-upload:power-sequence.png)

Muốn ngừng giữa chừng, chọn **DỪNG** trên thẻ. Máy đã bật giữ nguyên trạng thái bật; các máy chưa tới lượt vẫn tắt. Tắt một máy đang chờ tới lượt cũng gỡ máy đó khỏi hàng chờ.

Khoảng cách này áp dụng khi bật từ hai máy trở lên. Bật một máy riêng lẻ luôn diễn ra ngay.

## Đóng và mở shutter

Shutter che hình mà không tắt máy, hữu ích khi bạn cần màn hình tối giữa chương trình.

1. Với một máy, bấm nút **Đóng shutter** trên thẻ. Thẻ hiện nhãn **SHUTTER** màu vàng và nút đổi tên thành **Mở shutter**. Bấm lại để mở.
2. Với cả group, tìm cụm nút nhỏ có nhãn **SHUTTER** ở đầu trang. Nút con mắt mở là **Mở tất cả shutter (hiện hình)**; nút con mắt gạch là **Đóng tất cả shutter (che hình)**.
3. Khi bạn đóng shutter hàng loạt, một hộp thoại hỏi xác nhận. Chọn **ĐÓNG SHUTTER**.

Trang của máy có mục **SHUTTER / CHE HÌNH** làm việc tương tự: nút ở đó ghi **SHUTTER ĐÓNG** khi hình đang bị che và **MỞ SHUTTER** khi hình đang hiện. Bấm nút để đảo trạng thái.

## Khi một máy không phản hồi

Nếu thẻ ghi **MẤT KẾT NỐI**, MikMaster không nói chuyện được với máy đó. Xem [Xử lý sự cố](/store/mikmaster/docs/troubleshooting).
