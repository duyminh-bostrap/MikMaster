---
title: MikMaster
slug: mikmaster
summary: Điều khiển và giám sát nhiều máy chiếu AV từ một giao diện: bật tắt lần lượt, shutter, preview, nhiệt độ. Có driver cho Panasonic, Christie, Barco và PJLink.
tech_stack: [React, TypeScript, Vite, Tailwind CSS, Node.js]
releases_repo: duyminh-bostrap/MikMaster-releases
# TODO(owner): xác nhận repo công khai đúng là duyminh-bostrap/MikMaster-releases (tên này lấy từ chú thích trong .github/workflows/sync-release.yml, repo chưa kiểm được).
licensed: true
status: draft
---
MikMaster là phần mềm chạy ngay trên máy tính của bạn để điều khiển và giám sát nhiều máy chiếu AV cùng lúc trong sự kiện, sân khấu hay triển lãm. Bạn gom máy vào project và group, quét mạng để tìm máy chiếu, rồi bật tắt, che shutter hoặc đổi nguồn vào cho từng máy hay cả group chỉ với vài lần bấm.

Khi bật cả nhóm, MikMaster bật từng máy cách nhau vài giây (chỉnh được trong Cài đặt) để dòng khởi động của các máy không làm sụt điện hay nhảy aptomat. Trang Dashboard hiển thị nhiệt độ theo thời gian, độ sáng, trạng thái kết nối và nhật ký lỗi, kèm cảnh báo khi máy báo lỗi hoặc quá nóng. Ảnh preview của máy hiện ngay trên thẻ máy (bản Pro).

MikMaster có driver cho Panasonic PT-RQ35K, Christie Griffyn, Barco Pulse và mọi máy chiếu hỗ trợ PJLink; với giao thức TCP, UDP, Art-Net hay HTTP, bạn tự khai báo lệnh bật tắt. Ứng dụng chạy trên Windows 64-bit và macOS Apple Silicon, không cần cài Node, và lưu dữ liệu ngay trên máy của bạn.

Bản Free cho phép bật tắt máy và đóng mở shutter. Bản Pro mở thêm preview, đổi nguồn vào, test pattern, độ sáng, OSD và lệnh tự gõ.
