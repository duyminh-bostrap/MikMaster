---
title: Ghi chú phát hành
slug: release-notes
---
Mỗi bản MikMaster có ghi chú phát hành riêng gồm ba phần: **What's new**, **Fixes** và **Known issues**. Ghi chú nằm trong trang bản phát hành ở kho tải xuống công khai của MikMaster, cùng với bộ cài và tệp `SHA256SUMS.txt`. Tab Download trên trang sản phẩm dẫn tới các bản này.

## Số phiên bản

Bản có dạng `vMAJOR.MINOR.PATCH`, ví dụ `v0.6.3`. Số phiên bản hiện ở dòng **Phiên bản** trong hộp thoại **Giới thiệu MikMaster** (menu logo). Ngày dựng của từng bản được dùng để so với thời hạn cập nhật của giấy phép vĩnh viễn; xem [Bản Free, Pro và bản quyền](/store/mikmaster/docs/editions-and-licensing).

## Kiểm tra tệp tải về

Mỗi bản phát hành có tệp `SHA256SUMS.txt`, mỗi dòng gồm mã băm SHA-256 gồm 64 ký tự thập lục phân, hai dấu cách và tên tệp. Để kiểm:

1. Tính mã băm SHA-256 của tệp bạn đã tải. Trên Windows: `certutil -hashfile MikMaster-Setup.exe SHA256`. Trên macOS: `shasum -a 256 MikMaster-Setup.pkg`.
2. So với dòng cùng tên tệp trong `SHA256SUMS.txt`. Hai mã phải giống hệt nhau.

## Bản chưa ký

Bộ cài hiện chưa được ký số (Windows) và chưa được Apple công chứng (macOS), nên lần đầu chạy hệ điều hành hiện cảnh báo. Xem [Xử lý sự cố](/store/mikmaster/docs/troubleshooting).
