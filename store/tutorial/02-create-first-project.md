---
title: Tạo project đầu tiên và quét máy chiếu
slug: create-first-project
---
Bài này tạo một project, quét mạng để tìm máy chiếu và mở bảng điều khiển. Bạn cần MikMaster đã chạy ([Cài đặt và chạy lần đầu](/store/mikmaster/tutorial/install-first-run)) và máy chiếu đã bật nguồn điện, cắm mạng cùng dải IP với máy tính.

## Tạo project

1. Ở màn hình **Bắt đầu phiên làm việc**, chọn thẻ **Tạo & quét**.
2. Nhập tên vào ô **TÊN PROJECT**, ví dụ `Hội nghị Công nghệ 2026`.

   ![Bước 1 PROJECT với ô TÊN PROJECT và danh sách group](TODO-upload:new-project-name.png)

3. Giữ nguyên **Group 1** nếu chưa cần chia nhóm. Muốn thêm group, gõ tên vào ô **Group mới…** rồi nhấn Enter. Bạn đổi tên hoặc chuyển máy giữa các group sau cũng được.
4. Chọn **TIẾP: QUÉT**.

Bước 2 **QUÉT** hiện ra và quét bắt đầu ngay, thanh tiến độ chạy kèm chữ **● ĐANG QUÉT**.

## Quét máy chiếu

1. Đọc dòng **AUTO SCAN** ở đầu khung: đó là dải IP đang quét, ví dụ `192.168.1.1 – 192.168.1.254`.
2. Muốn đổi dải, sửa hai ô **Quét từ** và **Quét đến**, rồi chọn **QUÉT LẠI**. MikMaster chỉ quét địa chỉ mạng nội bộ (10.x, 172.16–31.x, 192.168.x, 127.x).
3. Đợi tới khi thấy **Quét xong**.

Mỗi máy tìm thấy hiện trong danh sách **MÁY TÌM THẤY** kèm tên, IP, model, giao thức và group. Dòng đầu trang ghi số máy tìm thấy và số máy đã chọn.

## Chọn máy và kiểm tra giao thức

1. Bỏ chọn máy bạn không muốn đưa vào project.
2. Với mỗi máy, mở danh sách **GIAO THỨC** và kiểm tra giao thức đúng với máy. MikMaster tự chọn giao thức; chỉ đổi khi nó chọn sai.
3. Mở danh sách group của máy và chọn group nếu cần.

## Thêm máy không quét thấy

Máy ở dải mạng khác hoặc chặn ping sẽ không hiện trong kết quả quét.

1. Trong khung **THÊM TAY**, nhập **ĐỊA CHỈ IP** của máy.
2. Quan sát: MikMaster điền sẵn giao thức, cổng, model và đặt tên theo model (cần MikMaster ở chế độ chạy thật). Sửa lại nếu cần, hoặc chọn một mục trong **MODEL**.
3. Chọn **THÊM MÁY**.

Máy mới xuất hiện cuối danh sách **MÁY TÌM THẤY**.

## Đăng nhập và mở project

Một số máy cần tài khoản để điều khiển. Khung đăng nhập hiện theo từng hãng, ví dụ **PANASONIC** và **CHRISTIE**.

![Danh sách máy tìm thấy và khung đăng nhập theo hãng](TODO-upload:scan-results-login.png)

1. Nhập **TÊN ĐĂNG NHẬP** và **MẬT KHẨU** cho mỗi hãng. Mặc định của MikMaster là `admin` / `admin`; hãy nhập tài khoản thật của máy nếu bạn đã đổi.
2. Chọn **ĐĂNG NHẬP & MỞ — N MÁY** để đăng nhập và vào bảng điều khiển.
3. Chọn **MỞ KHÔNG ĐĂNG NHẬP** nếu muốn vào trước rồi đăng nhập từng máy sau, ở trang của máy.

Với máy Christie Griffyn, tài khoản này chỉ dùng để xem live preview và là tuỳ chọn.

Bảng điều khiển hiện ra với tên project ở góc trên bên trái và các thẻ máy chiếu ở giữa.

![Bảng điều khiển với sáu thẻ máy chiếu](TODO-upload:dashboard-groups.png)

## Tiếp theo

[Bật tắt máy và shutter theo group](/store/mikmaster/tutorial/power-and-shutter).
