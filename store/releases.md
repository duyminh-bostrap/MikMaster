# Quy tắc phát hành MikMaster

Tài liệu này dành cho người phát hành, không hiển thị cho khách. Nó mô tả cách MikMaster đưa bộ cài lên kho tải xuống công khai để tab Download của trang sản phẩm liên kết tới.

## Kho phát hành

- Kho nguồn (riêng tư): `duyminh-bostrap/MikMaster`. Bộ cài được dựng và đính kèm vào bản phát hành ở đây.
- Kho tải xuống công khai: `duyminh-bostrap/MikMaster-releases`. Workflow chép bản phát hành sang đây.

TODO(owner): Xác nhận kho công khai tên đúng là `duyminh-bostrap/MikMaster-releases` và đã được tạo. Kho mã chỉ cấu hình qua biến `RELEASES_REPO` của GitHub Actions nên không đọc được giá trị thật.

## Quy tắc tag và tệp

- Tag: `vMAJOR.MINOR.PATCH`, ví dụ `v0.6.3`. Hậu tố như `-beta.1` được phép nhưng workflow đồng bộ hiện chỉ kiểm tag bắt đầu `v<số>.<số>.<số>`.
- Bản phát hành không để ở dạng draft hay pre-release.
- Tên tệp cố định:

| Tệp | Nền tảng | Ghi chú |
|---|---|---|
| `MikMaster-Setup.exe` | Windows 64-bit | Bộ cài Inno Setup |
| `MikMaster.exe` | Windows 64-bit | Chạy ngay, không cài |
| `MikMaster-Setup.pkg` | macOS Apple Silicon | Bộ cài |
| `MikMaster.dmg` | macOS Apple Silicon | Kéo thả |

- Mỗi bản phát hành công khai có thêm `SHA256SUMS.txt`, mỗi dòng gồm mã băm 64 ký tự thập lục phân, hai dấu cách, rồi tên tệp. Workflow tạo tệp này bằng `sha256sum`.
- Phiên bản trong `package.json` phải bằng số của tag. Workflow lấy phiên bản bộ cài Windows từ `package.json`.

## Nội dung ghi chú phát hành

Ghi chú là Markdown, không có ảnh hay HTML, dưới 20.000 ký tự, và có ba mục, đúng chính tả sau:

```
### What's new
- ...

### Fixes
- ...

### Known issues
- ...
```

Ghi rõ trong ghi chú nếu bộ cài chưa ký số hoặc chưa được Apple công chứng. Hiện cả hai đều chưa, nên mỗi bản phải có dòng: "Bộ cài chưa ký số (Windows) và chưa công chứng (macOS); lần đầu chạy hệ điều hành sẽ cảnh báo."

Các bản cũ (0.6.x) dùng tiêu đề tiếng Việt khác (`## Tải về`, `## Mới trong ...`, `## Chưa có / chưa kiểm`) và chưa theo quy tắc ba mục này. Workflow đồng bộ sẽ in cảnh báo (không chặn) khi thiếu mục hoặc vượt giới hạn.

## Ngày dựng

Ứng dụng nhúng thời điểm dựng (`BUILD_DATE`) lúc đóng gói, từ biến `MIKMASTER_BUILD_DATE` hoặc giờ hiện tại. `scripts/build-exe.mjs` ghi giá trị này vào tệp chạy. Bản quyền vĩnh viễn so ngày này với ngày kết thúc cập nhật của giấy phép (xem `license.md`). Workflow hiện không đặt `MIKMASTER_BUILD_DATE`, nên giá trị là giờ lúc dựng, sớm hơn thời điểm tạo bản phát hành vài phút.

## Cách phát hành một bản mới

1. Sửa `version` trong `package.json` thành số mới, ví dụ `0.6.4`, và commit.
2. Viết ghi chú theo mẫu trên, ví dụ trong `docs/releases/v0.6.4.md`.
3. Đẩy tag: `git tag v0.6.4` rồi `git push origin v0.6.4`.
4. Workflow **Build executables** chạy: dựng trên Windows và macOS, tạo bản phát hành ở kho riêng tư và đính kèm bốn tệp.
5. Khi dựng xong, job `sync-public` gọi workflow **Sync release to public repo**: tải các tệp, tạo `SHA256SUMS.txt`, rồi tạo hoặc cập nhật bản phát hành cùng tag ở kho công khai.
6. Mở bản phát hành ở kho riêng tư, dán ghi chú vào phần mô tả và lưu. Việc sửa ghi chú kích hoạt workflow đồng bộ chạy lại, nên ghi chú công khai được cập nhật theo.
7. Mở kho công khai và kiểm: có đủ tệp mong muốn, có `SHA256SUMS.txt`, ghi chú có ba mục, bản được đánh dấu **Latest**.

Có thể đồng bộ tay: **Actions**, **Sync release to public repo**, **Run workflow**, nhập tag.

### Cấu hình một lần

- Biến Actions `RELEASES_REPO` = `duyminh-bostrap/MikMaster-releases`.
- Secret `RELEASES_REPO_TOKEN`: token GitHub fine-grained chỉ có quyền Contents đọc và ghi trên kho công khai.

TODO(owner): Quy ước chung của các sản phẩm của bạn đặt tên secret là `RELEASES_TOKEN`, còn MikMaster dùng `RELEASES_REPO_TOKEN`. Bạn muốn đổi workflow sang `RELEASES_TOKEN` hay giữ tên hiện tại? Chưa đổi để tránh làm hỏng đồng bộ đang chạy.

## Hướng dẫn cài theo nền tảng (cho khách)

Bài hướng dẫn đầy đủ nằm ở `tutorial/01-install-and-first-run.md`. Tóm tắt:

### Windows

1. Chạy `MikMaster-Setup.exe`, chọn Next rồi Install. Không cần quyền quản trị; ứng dụng cài vào `%LOCALAPPDATA%\Programs\MikMaster`.
2. Lần đầu, SmartScreen báo "Windows protected your PC" vì bộ cài chưa ký số: chọn More info, rồi Run anyway.
3. Một cửa sổ đen hiện địa chỉ và trình duyệt tự mở. Giữ cửa sổ đó trong lúc dùng.

### macOS (Apple Silicon)

1. Bấm đúp `MikMaster-Setup.pkg`, chọn Continue rồi Install (cần mật khẩu máy Mac). Nếu macOS chặn: System Settings, Privacy & Security, Open Anyway.
2. Mở MikMaster từ Applications. Ứng dụng chạy nền và tự mở trình duyệt.
3. Khi macOS hỏi quyền Local Network, chọn Allow; nếu không MikMaster không thấy máy chiếu.
4. Cách khác: mở `MikMaster.dmg` và kéo MikMaster vào Applications.

### Cập nhật

Thoát bản đang chạy rồi chạy bộ cài mới. Dữ liệu được giữ nguyên.

TODO(owner): Có kế hoạch mua chứng chỉ ký mã Windows và tài khoản Apple Developer để ký và công chứng không? Khi có, cần bỏ các cảnh báo lần đầu chạy khỏi hướng dẫn.
