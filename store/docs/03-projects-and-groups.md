---
title: Project và group
slug: projects-and-groups
---
Một project chứa danh sách máy chiếu và các group của chúng. Trang này mô tả cách tạo, quét, lưu, xuất và sắp xếp project.

## Tạo project

Ở màn hình **Bắt đầu phiên làm việc**, chọn **Tạo & quét**. Bước 1 hỏi **TÊN PROJECT** và các group. Group là tuỳ chọn: mọi máy bắt đầu ở group đầu tiên, bạn đổi tên hoặc chuyển máy sau trên bảng điều khiển. Hướng dẫn từng bước nằm ở [Tạo project đầu tiên và quét máy chiếu](/store/mikmaster/tutorial/create-first-project).

## Quét mạng

- MikMaster đề xuất dải IP theo mạng của máy tính. Bạn sửa được hai ô **Quét từ** và **Quét đến**.
- Chỉ quét được địa chỉ mạng nội bộ: 10.x, 172.16 đến 172.31, 192.168.x và 127.x. Địa chỉ khác bị từ chối.
- Địa chỉ đầu phải nhỏ hơn địa chỉ cuối.
- Mỗi địa chỉ được dò trên cổng mặc định của từng giao thức hỗ trợ, với thời gian chờ 0,7 giây mỗi lần dò.
- Máy ở dải mạng khác hoặc chặn ping không hiện trong kết quả quét. Thêm chúng bằng khung **THÊM TAY**.

## Đăng nhập khi mở project

Một số máy cần tài khoản để điều khiển. Khung đăng nhập hiện theo từng hãng. Tài khoản mặc định MikMaster điền sẵn là `admin` / `admin`. Máy Christie Griffyn chỉ dùng tài khoản này để xem hình trực tiếp.

Bạn chọn **MỞ KHÔNG ĐĂNG NHẬP** để vào bảng điều khiển trước và đăng nhập từng máy sau ở trang của máy.

## Group

- Thêm group bằng **THÊM GROUP** ở cuối thanh bên.
- Bấm đúp vào tên group hoặc tên project để đổi tên.
- Xoá group bằng nút **Xoá group** khi rê chuột vào group. Hộp thoại cho bạn chọn group nhận các máy của group bị xoá. Project luôn giữ ít nhất một group.
- Chuyển máy bằng cách kéo thẻ vào group ở thanh bên, hoặc chuột phải vào thẻ rồi chọn group dưới **CHUYỂN SANG GROUP**.

## Thêm, sửa và gỡ máy chiếu

- **THÊM MÁY CHIẾU** thêm một máy bằng địa chỉ IP. MikMaster dò giao thức và hiện model nếu máy trả lời.
- **Sửa thông tin…** trong menu chuột phải đổi tên, group, IP và cổng. Hai máy không được dùng chung một cặp IP và cổng.
- **Gỡ khỏi project…** gỡ máy khỏi project. Máy chiếu thật không bị thay đổi.

## Lưu, mở và xuất

| Việc | Cách làm |
|---|---|
| Lưu | Menu logo, **Lưu**, hoặc Ctrl+S |
| Mở project đã lưu | Menu logo, **MỞ GẦN ĐÂY** (sáu project mới nhất), hoặc thẻ **Mở project** ở màn hình đầu |
| Xuất ra tệp | Menu logo, **Xuất ra tệp…**, hoặc Ctrl+Shift+S |
| Mở tệp | Menu logo, **Mở tệp…**, hoặc Ctrl+O |

Tệp xuất có đuôi `.mikmaster.json`, định dạng JSON, không chứa mật khẩu máy chiếu nhưng giữ tên đăng nhập. Tệp do một bản MikMaster mới hơn tạo ra có thể không mở được ở bản cũ.

Khi có thay đổi chưa lưu, thanh bên hiện nhãn **CHƯA LƯU**, và MikMaster hỏi trước khi bạn mở project khác, tạo project mới hoặc thoát.

Vị trí lưu trữ nằm ở [Dữ liệu và quyền riêng tư](/store/mikmaster/docs/data-and-privacy).

## Xem thêm

- [Lưu, mở lại và chuyển project sang máy khác](/store/mikmaster/tutorial/save-and-reopen)
- [Tìm máy nhanh và sắp xếp theo group](/store/mikmaster/tutorial/find-and-organize)
