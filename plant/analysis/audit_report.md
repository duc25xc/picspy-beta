# 🔍 Báo cáo Đánh giá & Rà soát Hệ thống PicSpy

Bản báo cáo này cung cấp cái nhìn chi tiết sau khi rà soát toàn bộ mã nguồn của dự án PicSpy (cả Frontend và Backend), đối chiếu với danh sách tác vụ tại [04_TASKS.md](file:///d:/DataOfDevelopers/Projects/2026/picspy/plant/04_TASKS.md) và tài liệu kỹ thuật tại [05_SKILLS.md](file:///d:/DataOfDevelopers/Projects/2026/picspy/plant/05_SKILLS.md).

---

## 📌 Phần 1: Trạng thái Tính năng & Xác định các phần còn ở dạng "Ý tưởng/Mock"

Sau khi phân tích kỹ các controller, model và route ở backend, dưới đây là trạng thái thực tế của các tính năng nâng cao:

| Phân vùng tính năng | Trạng thái hiện tại trong code | Các phần chưa hoàn thiện / Đang giả lập (Mock) |
| :--- | :--- | :--- |
| **Thanh toán & Nạp xu** | **Giả lập (Phase 1)** | Chưa tích hợp Stripe hay cổng thanh toán PayOS/VNPay. Chưa có route xử lý Webhook để tự động xác nhận giao dịch. Các trường dữ liệu đã có sẵn trong schema nhưng chưa có code xử lý logic thanh toán thực tế. |
| **Nâng cấp gói thành viên (Subscription)** | **Giả lập (Phase 1)** | API `requestSubscription` hiện tại chỉ trả về thông tin chuyển khoản Vietcombank thủ công. Việc kích hoạt gói vẫn yêu cầu Admin gọi API `/activate` bằng tay sau khi kiểm tra tài khoản. |
| **Hệ thống Thông báo (Notification Engine)** | **Mới hoàn thiện một phần** | Socket.io đã được khởi tạo trong `server.js` để kết nối real-time, nhưng chưa có API truy vấn lịch sử thông báo lưu trong DB, chưa có cơ chế tự động xóa thông báo cũ sau 90 ngày (TTL Index), và giao diện thông báo ở frontend chưa được kết nối hoàn chỉnh. |
| **Thuật toán Giảm nhiệt Bài đăng (Score Decay)** | **Chưa thực hiện** | Cron job/worker chạy hàng giờ để cập nhật lại `score` cho bài viết theo thời gian (Hacker News Algorithm) như mô tả ở tài liệu kỹ thuật vẫn chưa được viết. Điểm số hiện tại của bài viết là tĩnh. |
| **Hệ thống Rút tiền (Withdrawal)** | **Đã hoàn thiện** | Đã cấu hình đầy đủ ví VNĐ, ghi chép sổ cái giao dịch giao dịch khả dụng/tạm giữ, quyết toán tự động hàng đêm, và giao diện phê duyệt/từ chối yêu cầu rút tiền cho Admin. |

---

## 🧠 Phần 2: Phản biện Kiến trúc & Kiểm tra Logic

1. **Giao dịch an toàn khi không dùng Replica Set (Standalone MongoDB)**:
   * *Đánh giá*: Trong [WalletService.js](file:///d:/DataOfDevelopers/Projects/2026/picspy/backend/src/services/WalletService.js#L11-L37), hệ thống đã giải quyết rất tốt vấn đề này bằng hàm wrapper `runInTransaction`. Nếu chạy MongoDB cục bộ không bật Replica Set, hệ thống sẽ tự động hạ cấp xuống dùng atomic update không cần session thay vì crash ứng dụng. Đây là một điểm xử lý logic rất thông minh.
   
2. **Thiếu cơ chế giảm điểm theo thời gian (Score Decay)**:
   * *Vấn đề*: Do chưa có cron job chạy định kỳ cập nhật điểm hot, trang chủ sẽ dễ bị tình trạng "ảnh cũ đứng top mãi mãi" vì chúng đã tích lũy lượng tương tác lớn từ trước. 
   * *Giải pháp*: Cần lập lịch cho một job chạy mỗi 1 giờ để tính lại điểm số dựa trên số lượng tương tác mới nhận được chia cho thời gian từ lúc đăng.

3. **Chưa cài đặt thư viện thanh toán**:
   * *Đánh giá*: File kế hoạch nhắc tới Stripe nhưng trong `package.json` của backend vẫn chưa cài đặt gói `stripe`.

---

## 🚀 Phần 3: Đề xuất Các Giải pháp Cụ thể để Hoàn thiện

Dưới đây là 3 giải pháp tối ưu nhất để đưa các tính năng đang mock vào sản xuất thực tế:

### Giải pháp 1: Tích hợp cổng thanh toán VietQR qua PayOS
Đối với người dùng Việt Nam, thay vì Stripe, tích hợp PayOS sẽ mang lại trải nghiệm tốt nhất vì hỗ trợ thanh toán bằng quét mã VietQR tự động qua các ứng dụng ngân hàng.
* **Backend**: Thêm API `/v1/coins/topup` gọi PayOS SDK để sinh link thanh toán/mã QR.
* **Webhook**: Viết API nhận thông báo thanh toán thành công từ PayOS, áp dụng cơ chế kiểm tra chống trùng lặp giao dịch (Idempotency check) để cộng xu chính xác vào ví của tài khoản.

### Giải pháp 2: Cron Job Tự động hạ cấp Gói dịch vụ khi hết hạn
Để thay thế việc Admin phải quản lý thủ công:
* Tạo một cron job chạy vào lúc 00:00 hàng ngày.
* Tìm tất cả user có `subscriptionExpiry` nhỏ hơn thời gian hiện tại và tự động hạ cấp `subscriptionTier` của họ về `free`.

### Giải pháp 3: Viết Worker Cập nhật Điểm Hot (Score Decay)
* Tạo job `scoreDecay.js` chạy hàng giờ bằng thư viện `node-cron`.
* Áp dụng công thức tính điểm động:
  $$\text{Score} = \frac{\text{views} \times 0.1 + \text{likes} \times 3 + \text{downloads} \times 5 + \text{comments} \times 2}{(\text{ageInHours} + 2)^{1.5}}$$
