---
title: Lưu, mở lại và chuyển project sang máy khác
slug: save-and-reopen
---
Bài này hướng dẫn lưu project, mở lại project đã lưu, và xuất project ra một tệp để mang sang máy tính khác. Bạn cần một project đang mở ([Tạo project đầu tiên và quét máy chiếu](/store/mikmaster/tutorial/create-first-project)).

## Lưu project

1. Bấm logo MikMaster ở góc trên bên trái để mở menu **Tệp**.
2. Chọn **Lưu**, hoặc nhấn Ctrl+S (macOS: ⌘S).
3. Quan sát: menu hiện **Đã lưu** rồi tự đóng.

Khi project có thay đổi chưa lưu, nhãn **CHƯA LƯU** hiện cạnh tên project ở thanh bên. Nhãn mất sau khi bạn lưu.

Project lưu trong thư mục dữ liệu của MikMaster trên máy tính này, không gửi lên mạng. Mật khẩu máy chiếu được mã hoá trên đĩa.

## Mở lại project đã lưu

1. Mở menu **Tệp**.
2. Dưới **MỞ GẦN ĐÂY** có tối đa sáu project mới lưu gần nhất, kèm số máy và ngày lưu. Chọn một project để mở.
3. Nếu project không nằm trong danh sách, chọn **Project mới** để về màn hình đầu, rồi dùng thẻ **Mở project** và chọn project từ danh sách **project đã lưu**.

![Menu logo với mục MỞ GẦN ĐÂY](TODO-upload:logo-menu.png)

Khi bạn đang có thay đổi chưa lưu, MikMaster hỏi trước khi rời project. Chọn **LƯU** để lưu rồi đi tiếp, **KHÔNG LƯU** để bỏ thay đổi, hoặc **HUỶ** để ở lại.

## Xuất ra tệp để mang sang máy khác

1. Mở menu **Tệp**.
2. Chọn **Xuất ra tệp…**, hoặc nhấn Ctrl+Shift+S (macOS: ⇧⌘S).
3. Chọn nơi lưu tệp. Tệp có đuôi `.mikmaster.json`.

Tệp không chứa mật khẩu máy chiếu, nên bạn gửi hay copy sang USB đều được. Tên đăng nhập vẫn nằm trong tệp.

## Mở tệp project

1. Mở menu **Tệp**, chọn **Mở tệp…**, hoặc nhấn Ctrl+O (macOS: ⌘O). Ở màn hình đầu, bạn cũng chọn được **MỞ TỆP…**.
2. Chọn tệp `.mikmaster.json`.
3. Vì tệp không có mật khẩu, nếu có máy cần đăng nhập, MikMaster đưa bạn tới bước đăng nhập. Nhập tài khoản rồi chọn **ĐĂNG NHẬP & MỞ**, hoặc chọn **MỞ KHÔNG ĐĂNG NHẬP** để đăng nhập từng máy sau.

Quan sát: bảng điều khiển hiện ra với đúng tên project, group và danh sách máy bạn đã xuất.

Nếu MikMaster báo tệp không đọc được, tệp có thể không phải tệp project của MikMaster, đã bị hỏng, hoặc do một bản MikMaster mới hơn tạo ra. Cài bản MikMaster mới nhất rồi mở lại.
