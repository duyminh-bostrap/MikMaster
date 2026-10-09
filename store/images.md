# Danh sách ảnh dùng trong bài viết

Mọi ảnh nằm trong `store/images/` (tệp có sẵn) hoặc cần chụp thêm (cột Trạng thái). Trong bài, ảnh viết dạng `![mô tả](TODO-upload:tên-tệp)` để chủ sản phẩm tải lên và thay bằng địa chỉ thật.

Ảnh đã chụp có kích thước 1440x900 từ bản MikMaster dựng từ mã nguồn hiện tại. Trừ `first-run-license.png`, tất cả chụp ở chế độ mô phỏng (chân trang ghi MÔ PHỎNG · KHÔNG CÓ GATEWAY), nên dữ liệu máy chiếu là dữ liệu mẫu có sẵn trong ứng dụng, không phải máy thật.

| Tệp | Dùng ở | Hiển thị gì | Trạng thái ứng dụng khi chụp | Trạng thái |
|---|---|---|---|---|
| `first-run-license.png` | tutorial 01 | Màn hình đầu tiên khi chưa có bản quyền: **CẦN LICENSE**, ô khoá, **TIẾP TỤC VỚI BẢN FREE** | Gateway thật, thư mục dữ liệu mới, chưa có bản quyền | Đã chụp |
| `start-screen.png` | tutorial 01 | Màn hình **Bắt đầu phiên làm việc** với hai thẻ **Tạo & quét** và **Mở project** | Mô phỏng, chưa mở project | Đã chụp |
| `new-project-name.png` | tutorial 02 | Bước 1 **PROJECT**, ô **TÊN PROJECT** và danh sách group | Mô phỏng, đã gõ tên project | Đã chụp |
| `scan-results-login.png` | tutorial 02 | **MÁY TÌM THẤY** và các khung đăng nhập theo hãng | Mô phỏng, quét xong | Đã chụp |
| `dashboard-groups.png` | tutorial 02, tutorial 03 | Bảng điều khiển với sáu thẻ máy chiếu, hai ô **BẬT MÁY** và **TẮT / CHỜ** | Mô phỏng, project mẫu | Đã chụp |
| `settings-dialog.png` | tutorial 03 | Hộp thoại **CÀI ĐẶT** với thanh **KHOẢNG CÁCH GIỮA CÁC LẦN BẬT MÁY** | Mô phỏng, giá trị mặc định 5 giây | Đã chụp |
| `power-sequence.png` | tutorial 03 | Thẻ tiến trình **Đang bật n/m** với nút **DỪNG** | Mô phỏng, đang bật lần lượt | Đã chụp |
| `projector-page.png` | tutorial 04 | Trang của một máy chiếu: nguồn, hình trực tiếp, input, test pattern, độ sáng | Mô phỏng, máy đang bật, giao diện bản Pro | Đã chụp |
| `logo-menu.png` | tutorial 05 | Menu **Tệp** mở từ logo, có **MỞ GẦN ĐÂY** | Mô phỏng, đã có project đã lưu | Đã chụp |
| `search-filter.png` | tutorial 06 | Ô tìm kiếm đang lọc danh sách | Mô phỏng, đã gõ từ khoá | Đã chụp |
| `dashboard-monitor.png` | tutorial 06 | Chế độ **Bảng điều khiển** với biểu đồ nhiệt độ | Mô phỏng, bật **DÙNG DỮ LIỆU MẪU** (ảnh mang nhãn **DỮ LIỆU MẪU — không phải số đo thật**) | Đã chụp |
| `windows-smartscreen.png` | tutorial 01 | Hộp thoại SmartScreen "Windows protected your PC" của bộ cài, ở bước **More info** hiện nút **Run anyway** | Chạy `MikMaster-Setup.exe` lần đầu trên Windows | **Cần chụp** trên máy Windows thật |
| `macos-open-anyway.png` | tutorial 01 | **System Settings**, **Privacy & Security**, nút **Open Anyway** cho MikMaster | Sau lần mở đầu bị chặn, trên macOS | **Cần chụp** trên máy Mac thật |
| `macos-local-network.png` | tutorial 01 | Hộp thoại macOS hỏi quyền **Local Network** cho MikMaster | Lần đầu mở MikMaster trên macOS | **Cần chụp** trên máy Mac thật |

## Ảnh bìa

`preview/cover.png` (1600x1000, giao diện thật, không có chữ ghi sẵn lặp lại tên sản phẩm) là ảnh bìa cho tab Preview. Nó chụp ở chế độ mô phỏng, trang Bảng điều khiển với dữ liệu mẫu của ứng dụng.

## Ảnh chưa chụp được

Ba ảnh hệ điều hành ở trên cần máy Windows và macOS thật. Môi trường dựng tài liệu này chạy Linux nên không chụp được; không dùng ảnh dựng lại. 

TODO(owner): Chụp ba ảnh `windows-smartscreen.png`, `macos-open-anyway.png`, `macos-local-network.png` trên máy thật và thêm vào `store/images/`. Nếu bạn muốn ảnh thật của máy Panasonic hoặc Christie (hình trực tiếp, test pattern), hãy chụp từ máy thật và gửi thêm; các ảnh hiện có đều ở chế độ mô phỏng.
