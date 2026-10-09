---
title: Giao thức và dòng máy được hỗ trợ
slug: supported-projectors
---
Trang này liệt kê các giao thức MikMaster nói được, cổng mặc định, chức năng mỗi giao thức có và mức đã kiểm tra. Mức kiểm tra là thông tin quan trọng: nhiều driver được viết theo tài liệu công bố của hãng và chưa chạy trên mọi model.

## Giao thức

| Giao thức | Cổng mặc định | Chức năng |
|---|---|---|
| PJLink Class 1 và Class 2 | 4352 | Nguồn, shutter, input, lệnh thô |
| Panasonic NTCONTROL | 1024 | Nguồn, shutter, input, OSD, độ sáng, test pattern, hình trực tiếp, lệnh thô |
| Christie serial qua IP | 3002 | Nguồn, shutter, input, OSD, test pattern, hình trực tiếp, lệnh thô |
| Barco Pulse | 9090 | Nguồn, shutter, lệnh thô |
| TCP chung | 4000 | Lệnh thô và lệnh tự khai báo |
| UDP chung | 5000 | Lệnh thô và lệnh tự khai báo |
| Art-Net | 6454 | Lệnh thô và lệnh tự khai báo |
| HTTP API | 80 | Lệnh thô và lệnh tự khai báo |

Lệnh OSD chỉ được xác minh với Christie; ở dòng máy khác nút OSD có thể chỉ đổi trạng thái hiển thị trong ứng dụng. Bản Free chỉ dùng nguồn và shutter của bảng trên. Các chức năng còn lại cần bản Pro.

Khi quét hoặc thêm máy bằng IP, MikMaster dò giao thức giúp bạn. Một máy Panasonic trả lời được cả PJLink lẫn NTCONTROL sẽ được đặt là PJLink.

## Test pattern theo giao thức

| Giao thức | Mẫu gửi được tới máy |
|---|---|
| Panasonic NTCONTROL | White, Black, Crosshatch, Grid, Color Bars, Focus |
| Christie serial qua IP | Grid, White, Black, Color Bars |

Mẫu nào máy không có lệnh thì nút bị mờ.

## Input trong giao diện

Giao diện có các nút **HDMI 1**, **HDMI 2**, **SDI 1**, **SDI 2**, **HDBaseT**, **DisplayPort** và **DVI**. Máy nào không có cổng đó thì không chuyển được. Ví dụ PT-RQ35K qua PJLink chỉ có HDMI 1 và HDMI 2.

## Mức đã kiểm trên máy thật

Hai máy đã được thử, chỉ bằng lệnh hỏi, ngày 29/09/2026: Panasonic PT-RQ35K (firmware 1.21) và Christie Griffyn 4K50-RGB (phiên bản 1.3.7).

| Chức năng | PT-RQ35K | Griffyn 4K50-RGB |
|---|---|---|
| Đọc trạng thái nguồn | Đã kiểm | Đã kiểm |
| Đọc shutter | Đã kiểm | Đã kiểm |
| Đọc input | Đã kiểm | Đã kiểm |
| Đọc giờ đèn hoặc laser | Đã kiểm | Đã kiểm |
| Đọc nhiệt độ | Chưa kiểm | Đã kiểm, kèm 12 cảm biến |
| Hình trực tiếp | Đã kiểm | Chỉ kiểm với bộ giả lập |
| Đọc vị trí lens | Không có lệnh | Đã kiểm |
| Đổi input, test pattern, OSD | Chưa kiểm | Chưa kiểm |

Lệnh ghi (bật máy, đổi input, hiện test pattern) được viết theo tài liệu và chưa được xác nhận bằng cách gửi thật lên cả hai máy. Dùng ô **RAW COMMAND** để thử lệnh trên máy của bạn trước khi dựa vào chúng. Xem [Lệnh nâng cao](/store/mikmaster/docs/advanced-commands).

Panasonic và Christie là chủ sở hữu tên thương hiệu của họ. MikMaster là sản phẩm độc lập và không do các hãng này cung cấp hay chứng nhận.

TODO(owner): Xác nhận câu cuối về thương hiệu có đúng ý bạn, và bổ sung danh sách model đã thử nếu có thêm ngoài PT-RQ35K và Griffyn 4K50-RGB.

## Xem thêm

- [Trang máy chiếu](/store/mikmaster/docs/projector-page)
- [Xử lý sự cố](/store/mikmaster/docs/troubleshooting)
