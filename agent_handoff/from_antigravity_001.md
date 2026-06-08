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
Để vận hành ngoại cảnh tương tác như một game, chúng ta cần phối hợp cả 3 Tác nhân:
1. **GM Agent (Game Master):** 
   - Đóng vai trò trọng tài thế giới vật lý.
   - Nhận diện các sự kiện trong tin nhắn chat để cập nhật **Đồng hồ ảo** (ví dụ: người dùng rủ đi ngủ -> nhảy thời gian tới sáng mai) và **Bản đồ ảo** (ví dụ: thời tiết mưa/nắng, cảnh vật thay đổi, các vật thể xuất hiện).
2. **AD Agent (Tiềm thức/Phản hồi):**
   - Đọc trạng thái Ngoại cảnh từ bộ nhớ và so sánh với lịch sử chat.
   - Sinh ra các chỉ dẫn và quy tắc ứng xử cụ thể bắt buộc cho turn thoại tiếp theo (Ví dụ: *"Itto phải lạnh run người vì thời tiết đang mưa bão lớn, sấm sét đánh bên ngoài"*).
3. **RP Agent (Roleplay Writer):**
   - Định hình chỉ thị Nudge từ AD Agent dưới dạng System Note để tiêm trực tiếp vào prompt chính gửi lên LLM của SillyTavern.

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
