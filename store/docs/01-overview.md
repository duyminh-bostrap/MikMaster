---
title: Tổng quan MikMaster
slug: overview
---
MikMaster là ứng dụng điều khiển và giám sát máy chiếu AV theo project và group. Bạn bật tắt máy, đóng mở shutter, xem hình trực tiếp và theo dõi nhiệt độ của nhiều máy chiếu trên cùng một màn hình, trong cùng mạng nội bộ.

## Ứng dụng gồm những phần nào

MikMaster gồm hai phần chạy chung một tiến trình trên máy tính của bạn.

- **Gateway** nói chuyện với máy chiếu qua TCP, UDP và HTTP. Trình duyệt không tự làm được việc này.
- **Giao diện web** do gateway phục vụ tại địa chỉ `http://mikmaster.localhost:8787` và tự mở trong trình duyệt mặc định khi bạn chạy MikMaster.

Máy tính chạy MikMaster phải nằm cùng mạng với các máy chiếu, ví dụ cùng dải `192.168.1.x`. Mặc định chỉ chính máy tính đó mở được giao diện. Xem [Dữ liệu và quyền riêng tư](/store/mikmaster/docs/data-and-privacy) để biết cách mở ra cho máy khác.

## Các khái niệm chính

- **Project**: một buổi diễn hoặc một địa điểm, gồm danh sách máy chiếu và các group.
- **Group**: một nhóm máy chiếu, ví dụ một phòng hay một khu. Bạn bật, tắt và đóng shutter cả group bằng một lần bấm.
- **Máy chiếu**: một thiết bị có địa chỉ IP và một giao thức điều khiển.

## Việc MikMaster làm được

- Quét một dải IP để tìm máy chiếu, hoặc thêm từng máy bằng địa chỉ IP. Xem [Project và group](/store/mikmaster/docs/projects-and-groups).
- Bật tắt máy và đóng mở shutter theo từng máy hoặc theo group, có thể bật lần lượt để tránh sụt điện. Xem [Nguồn và shutter](/store/mikmaster/docs/power-and-shutter).
- Xem hình trực tiếp, đổi input, hiện test pattern, chỉnh độ sáng ở bản Pro. Xem [Trang máy chiếu](/store/mikmaster/docs/projector-page).
- Theo dõi nhiệt độ, thời gian từ lúc bật máy, nhật ký và lỗi. Xem [Giám sát](/store/mikmaster/docs/monitoring).
- Gửi lệnh thô và tự khai báo lệnh cho các giao thức chung. Xem [Lệnh nâng cao](/store/mikmaster/docs/advanced-commands).

## Hai bản: Free và Pro

Bản Free bật tắt máy và đóng mở shutter. Bản Pro mở thêm hình trực tiếp, input, OSD, test pattern, độ sáng và lệnh thô. Xem [Bản Free, Pro và bản quyền](/store/mikmaster/docs/editions-and-licensing).

## Giới hạn hiện tại

- Driver của máy chiếu được viết theo tài liệu giao thức đã công bố và chưa được kiểm trên mọi dòng máy. Phần đã kiểm trên máy thật được ghi rõ ở [Giao thức và dòng máy được hỗ trợ](/store/mikmaster/docs/supported-projectors).
- Điều khiển lens chưa dùng được khi nối với máy thật.

## Xem thêm

- [Yêu cầu hệ thống](/store/mikmaster/docs/system-requirements)
- [Phím tắt](/store/mikmaster/docs/keyboard-shortcuts)
- [Xử lý sự cố](/store/mikmaster/docs/troubleshooting)
- [Câu hỏi thường gặp](/store/mikmaster/docs/faq)
- [Ghi chú phát hành](/store/mikmaster/docs/release-notes)
