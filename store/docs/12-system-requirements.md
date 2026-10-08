---
title: Yêu cầu hệ thống
slug: system-requirements
---
## Hệ điều hành

| Hệ điều hành | Dạng cài | Ghi chú |
|---|---|---|
| Windows 64-bit | `MikMaster-Setup.exe` (bộ cài) hoặc `MikMaster.exe` (chạy ngay, không cài) | Không cần quyền quản trị; cài vào `%LOCALAPPDATA%\Programs\MikMaster` |
| macOS Apple Silicon | `MikMaster-Setup.pkg` (bộ cài) hoặc `MikMaster.dmg` (kéo thả) | Bộ cài cần mật khẩu của máy Mac |

Không có bản cho Mac Intel, Linux hay Windows 32-bit trong các bản phát hành.

TODO(owner): Phiên bản Windows và macOS thấp nhất bạn đã thử và muốn ghi là yêu cầu tối thiểu là gì? Kho mã không ghi và không có file bộ cài đặt giới hạn phiên bản.

## Cài thêm gì

Không cần. Ứng dụng đã chứa sẵn mọi thứ nó cần và cài được khi máy không có mạng. Bạn không phải cài Node.js hay tải thêm gì.

## Trình duyệt

MikMaster mở giao diện trong trình duyệt mặc định của máy tính. Chrome, Edge và Firefox dùng được với địa chỉ `http://mikmaster.localhost:8787`. Safari không nhận địa chỉ `mikmaster.localhost`; dùng `http://127.0.0.1:8787`.

TODO(owner): Danh sách trình duyệt và phiên bản tối thiểu bạn đã thử là gì? Kho mã có kiểm thử tự động nhưng không ghi trình duyệt tối thiểu.

## Mạng

- Máy tính chạy MikMaster phải nằm cùng mạng với các máy chiếu, ví dụ cùng dải `192.168.1.x`.
- MikMaster chỉ làm việc với địa chỉ IPv4 nội bộ: 10.x, 172.16 đến 172.31, 192.168.x, 169.254.x và 127.x.
- Cổng 8787 trên máy tính phải còn trống. Nếu cổng bận, MikMaster báo lỗi và có thể đổi bằng biến môi trường `PORT`.
- Máy tính cần cho phép MikMaster kết nối tới cổng điều khiển của máy chiếu (xem [Giao thức và dòng máy được hỗ trợ](/store/mikmaster/docs/supported-projectors)). Trên macOS, hãy cấp quyền **Mạng cục bộ** khi được hỏi; không có quyền này MikMaster không thấy máy chiếu.
- Hình trực tiếp từ máy Panasonic cần máy tính mở được cổng 8080 của máy chiếu.

## Phần cứng

TODO(owner): RAM, dung lượng đĩa và CPU tối thiểu bạn muốn khuyến nghị là bao nhiêu? Kho mã không có số đo hay yêu cầu nào.

## Internet

Điều khiển máy chiếu không cần internet. Internet chỉ dùng cho kiểm tra bản quyền qua mạng khi bản MikMaster của bạn được cấu hình với máy chủ tài khoản hoặc địa chỉ kiểm tra. Xem [Bản Free, Pro và bản quyền](/store/mikmaster/docs/editions-and-licensing) và [Dữ liệu và quyền riêng tư](/store/mikmaster/docs/data-and-privacy).
