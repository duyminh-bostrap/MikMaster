---
title: Cài đặt và chạy lần đầu
slug: install-first-run
---
Bài này đưa MikMaster từ file cài đặt tới màn hình "Bắt đầu phiên làm việc". Mất khoảng năm phút.

## Chuẩn bị

- Cho máy tính chạy MikMaster vào cùng mạng với máy chiếu (cùng dải IP, ví dụ 192.168.1.x).
- Tải bộ cài ở trang [Download](/store/mikmaster/download): `MikMaster-Setup.exe` cho Windows 64-bit, `MikMaster-Setup.pkg` cho macOS Apple Silicon.
- Không cần cài Node hay phần mềm nào khác.

## Cài trên Windows

1. Chạy `MikMaster-Setup.exe`.
2. Nếu Windows hiện *Windows protected your PC*, chọn *More info* rồi *Run anyway*. Bộ cài chưa được ký số nên cảnh báo này là bình thường.

   ![Hộp thoại SmartScreen của Windows với nút More info](TODO-upload:windows-smartscreen.png)

3. Chọn *Next*, rồi *Install*. Bộ cài không cần quyền admin và cài vào `%LOCALAPPDATA%\Programs\MikMaster`.
Khi bộ cài chạy xong, MikMaster tự mở.

Một cửa sổ đen hiện địa chỉ của MikMaster và trình duyệt mở trang MikMaster. Giữ cửa sổ đen mở trong lúc dùng: đóng nó là tắt MikMaster.

## Cài trên macOS

1. Bấm đúp `MikMaster-Setup.pkg`, chọn *Continue*, rồi *Install*. Nhập mật khẩu Mac khi được hỏi.
2. Nếu macOS chặn vì bộ cài chưa ký: chuột phải vào file, chọn *Open*, rồi *Open*. Hoặc vào **System Settings → Privacy & Security** và chọn *Open Anyway* (macOS 14 trở về trước: chuột phải vào file, chọn *Open*).

   ![Mục Open Anyway trong System Settings, Privacy & Security](TODO-upload:macos-open-anyway.png)

3. Mở MikMaster từ **Applications** hoặc Launchpad. Nếu macOS báo không mở được vì app chưa được Apple công chứng, làm lại cách ở bước 2 cho app.
4. Khi macOS hỏi quyền **Local Network**, chọn *Allow*. Nếu từ chối, MikMaster không thấy máy chiếu trong mạng.

   ![Hộp thoại macOS xin quyền Local Network cho MikMaster](TODO-upload:macos-local-network.png)

MikMaster chạy nền, không có cửa sổ riêng, và tự mở trình duyệt.

## Kiểm tra MikMaster đã sẵn sàng

1. Nhìn xuống chân trang của trình duyệt.
2. Tìm huy hiệu **CHẠY THẬT · ĐÃ KẾT NỐI GATEWAY**. Huy hiệu này cho biết MikMaster điều khiển máy chiếu thật.
3. Nếu thấy **MÔ PHỎNG · KHÔNG CÓ GATEWAY**, app đang chạy dữ liệu mẫu và chưa điều khiển máy nào. Xem [Khắc phục sự cố](/store/mikmaster/docs/troubleshooting).

## Chọn bản dùng

Lần đầu mở, MikMaster hiện trang **CẦN LICENSE**.

![Trang CẦN LICENSE với ô Khoá bản quyền và nút TIẾP TỤC VỚI BẢN FREE](TODO-upload:first-run-license.png)

1. Chọn **TIẾP TỤC VỚI BẢN FREE** để vào ngay. Bản Free bật tắt máy chiếu và đóng mở shutter.
2. Nếu đã có khoá, dán khoá vào ô **Khoá bản quyền** rồi chọn **KÍCH HOẠT** để mở bản Pro. Cách lấy khoá nằm ở [Bản Free, bản Pro và license](/store/mikmaster/docs/editions-and-licensing).

Màn hình **Bắt đầu phiên làm việc** hiện ra với hai thẻ: **Tạo & quét** và **Tiếp tục làm việc**.

![Màn hình Bắt đầu phiên làm việc](TODO-upload:start-screen.png)

## Tắt MikMaster

1. Bấm vào logo **MikMaster** ở góc trên bên trái để mở menu.
2. Chọn **Thoát MikMaster**.

## Tiếp theo

[Tạo project đầu tiên và quét máy chiếu](/store/mikmaster/tutorial/create-first-project).
