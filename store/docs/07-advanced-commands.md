---
title: Lệnh nâng cao và giao thức chung
slug: advanced-commands
---
Trang này mô tả trang **Nâng cao**, ô **RAW COMMAND** và cách khai báo lệnh cho các giao thức chung (TCP, UDP, Art-Net, HTTP).

## Mở trang Nâng cao

Bấm logo MikMaster, chọn **Nâng cao…**. Trang này có hai phần: tài liệu lệnh theo hãng và lệnh tự khai báo. Các lệnh do gateway lưu, nên chỉ dùng được khi MikMaster đã nối với gateway.

## Tài liệu lệnh

Chọn **Hãng** (PJLink, Panasonic, Christie hoặc Barco) để xem bảng **TÀI LIỆU LỆNH** gồm lệnh, chức năng, loại **HỎI** hoặc **GHI**, và nguồn. Cột nguồn ghi mức tin cậy của từng lệnh:

| Mức | Nghĩa |
|---|---|
| **ĐÃ KIỂM TRÊN MÁY** | Lệnh đã được thử trên máy thật |
| **THEO TÀI LIỆU** | Lệnh lấy từ tài liệu của hãng, chưa thử trên máy thật |
| **CHƯA KIỂM** | Lệnh chưa có tài liệu hay thử nghiệm đối chiếu |

Dùng ô **Tìm lệnh** và các nút **TẤT CẢ**, **HỎI**, **GHI** để lọc.

## Lệnh tự khai báo cho cả hãng

Phần **LỆNH TỰ KHAI BÁO** cho bạn nhập lệnh thay cho lệnh có sẵn, áp cho mọi máy cùng hãng. Lệnh được gửi đúng như bạn gõ. Để trống một ô thì MikMaster giữ lệnh có sẵn (hiện mờ). Lệnh đặt riêng trên một máy được ưu tiên hơn lệnh đặt cho cả hãng. Nút **VỀ MẶC ĐỊNH** xoá lệnh tự khai báo.

Có thể khai báo bốn nhóm: **Nguồn**, **Shutter**, **Test pattern** và **Số liệu đọc** (lệnh hỏi nhiệt độ và giờ đèn). Test pattern không có chuẩn chung giữa các hãng: lấy lệnh từ tài liệu của máy và thử trong **RAW COMMAND** trước.

## Giao thức chung

TCP, UDP, Art-Net và HTTP API không có bộ lệnh chuẩn. Nút nguồn và shutter chỉ hoạt động sau khi bạn nhập lệnh ở mục **LỆNH** của trang máy. Điền đủ cả cặp (**BẬT MÁY** và **TẮT MÁY**, hoặc đóng và mở shutter) thì nút tương ứng mới dùng được.

| Giao thức | Cú pháp lệnh |
|---|---|
| TCP | Văn bản gửi nguyên văn. Dùng `\r`, `\n` và `\xHH` cho ký tự điều khiển |
| UDP | Một gói UDP, cùng quy ước ký tự điều khiển |
| Art-Net | `[universe] kênh=giá_trị …`, ví dụ `0 1=255 5-8=128` |
| HTTP API | `GET /đường-dẫn` hoặc `POST /đường-dẫn nội-dung`, tài khoản lấy từ phần đăng nhập |

## RAW COMMAND

Thẻ **RAW COMMAND** ở khay **TERMINAL** gửi nguyên văn một lệnh tới máy và hiện phản hồi. Chức năng này cần bản Pro. Dùng nó để đối chiếu lệnh với máy thật. Bạn chịu trách nhiệm về lệnh mình gửi: MikMaster không kiểm tra ý nghĩa của lệnh.

## Đọc số liệu bằng lệnh hỏi

Với giao thức không có sẵn nhiệt độ và giờ đèn, nhập lệnh hỏi từ tài liệu của máy, ở phần **Số liệu đọc** của trang Nâng cao hoặc mục **LỆNH** trên trang máy, vào **LỆNH HỎI NHIỆT ĐỘ** và **LỆNH HỎI GIỜ ĐÈN**. Nếu cần, thêm mẫu lấy số (**MẪU LẤY SỐ NHIỆT ĐỘ**, **MẪU LẤY SỐ GIỜ ĐÈN**) là biểu thức chính quy có nhóm đầu tiên bắt con số, ví dụ `TMP:(\d+)`. Để trống mẫu thì MikMaster lấy số cuối cùng trong phản hồi. Giá trị được đọc lại vài giây một lần.

## Xem thêm

- [Giao thức và dòng máy được hỗ trợ](/store/mikmaster/docs/supported-projectors)
- [Trang máy chiếu](/store/mikmaster/docs/projector-page)
