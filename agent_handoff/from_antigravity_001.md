# 🔄 Biên Bản Bàn Giao: Reboot Dự Án & Định Hướng Cột Trụ 1 (v0.12.3)

> **Người viết:** Antigravity (Implementer)  
> **Gửi tới:** Claude (Reviewer) / Antigravity (Next Session)  
> **Trạng thái:** Sẵn sàng cho Phiên tiếp theo  

---

## 🎯 1. Trạng Thái Hiện Tại (Current State)

- **Mã nguồn:** Đã tối giản hóa hoàn toàn về khung xương `v0.12.3`. Chỉ giữ lại các stub/contract tối thiểu cho trạng thái, giao diện, và các event binding.
- **Dọn dẹp (Cleanup):**
  - Đã xóa sạch toàn bộ 15 file bàn giao cũ trong `agent_handoff/`. File này (`from_antigravity_001.md`) là file đầu tiên của chu kỳ mới.
  - Đã xóa các file nghiên cứu cũ (`research_*.md`) trong `docs/` để tránh bị sa vào các lối mòn thiết kế phức tạp trước đây.
- **Git & Tests:**
  - Đã commit và push toàn bộ thay đổi dọn dẹp lên branch `main`.
  - Chạy `npm test` và `npm run lint` kiểm tra cục bộ: **10/10 tests qua thành công, 0 cảnh báo/lỗi linter**.

---

## 💡 2. Bài Học Rút Ra & Tầm Nhìn Core (What We Learned)

1. **Triết lý của Anima:** Anima không phải là một mô phỏng sinh học cồng kềnh với các công thức hóa học phức tạp. Nó là một **Game Engine thu nhỏ** chạy ngầm trong SillyTavern.
2. **Nhiệm vụ cốt lõi:** Duy trì một thực tại khách quan (ngoại cảnh, thời gian, cơ thể, sự kiện thực tế) và dùng nó làm mỏ neo ép AI chính phải tương tác, ngăn chặn triệt để tình trạng OOC (Out-Of-Character) và hallucination (bịa đặt thông tin).
3. **Phương pháp phát triển:** Phát triển **độc lập từng tính năng một tới mức hoàn thiện/cực đoan**, không làm song song nhiều tính năng cùng lúc để tránh làm loãng hệ thống và gây mệt mỏi cho người dùng.

---

## 🗺️ 3. Kế Hoạch Cho Phiên Tiếp Theo: Ngoại Cảnh Engine (Option 1)

Người dùng đã lựa chọn **Lựa chọn 1: Hệ thống Ngoại cảnh (Environment Engine)** làm phát súng đầu tiên. 

### Thiết kế Tác nhân cho Cột trụ 1:
Để vận hành ngoại cảnh tương tác như một game, chúng ta phối hợp các vai trò cực kỳ rõ ràng:
1. **GM Agent (Game Master):** 
   - Đóng vai trò trọng tài của thế giới vật lý và diễn biến nội tâm.
   - Nhận diện các sự kiện trong tin nhắn chat để cập nhật **Đồng hồ ảo** và **Bản đồ ảo**, đồng thời xác định cảm xúc đích và ý đồ thoại tiếp theo.
2. **RP Agent (Roleplay Writer):**
   - Đóng vai trò biên kịch, đóng gói trực tiếp các thông số thực tại và ý đồ từ GM Agent thành System Note (Narrative Nudge) để tiêm vào cuộc trò chuyện chính của SillyTavern.
3. **AD Agent (Admin/Project Assistant):**
   - Đóng vai trò là trợ lý quản trị dự án ở hậu trường (Backstage). Nhiệm vụ duy nhất là cập nhật, thay đổi sâu sắc các thông số hệ thống khi cần hoặc khi được yêu cầu (ví dụ: qua console commands, settings panel hoặc khi cần can thiệp thông số sâu). Không can thiệp vào luồng sinh nudge thoại thông thường của GM và RP.

### Các bước cần làm ngay ở phiên sau:
1. **Dựng giao diện và lưu trữ tĩnh:**
   - Cấu hình file mô tả vị trí tĩnh (ví dụ: `characters/itto/locations.json` gồm các địa điểm quen thuộc và mô tả cảnh quan).
   - Thêm phần lưu trữ `environment` (gồm `current_location`, `weather`, `time_clock`, `active_objects`) vào `src/core/state.js`.
   - Cập nhật dashboard hiển thị trực quan các thông số ngoại cảnh này lên Panel.
2. **Đấu nối GM Agent thật:**
   - Cấu hình `generateQuietPrompt()` trong `src/agents/gm.js` để gửi prompt ẩn phân tích chat và trả về XML cập nhật Ngoại cảnh.
   - Viết bộ parse XML cập nhật Ngoại cảnh vào State.
3. **Đấu nối AD & RP Agent:**
   - Xây dựng logic sinh chỉ thị Nudge dựa trên Ngoại cảnh mới cập nhật để ép AI chính tuân thủ.
