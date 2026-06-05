# BÁO CÁO KỸ THUẬT: KIẾN TRÚC NHẬN THỨC ST ANIMA (v10)
**Ngày báo cáo:** 05/06/2026
**Dự án:** SillyTavern Anima Engine
**Phân hệ:** Hệ Sinh Thái Nhận Thức (Cognitive Architecture)

---

## 1. TỔNG QUAN DỰ ÁN (WHAT)

**ST Anima Engine** là một kiến trúc nhận thức (Cognitive Architecture) tiên tiến được thiết kế dưới dạng tiện ích mở rộng (extension) cho nền tảng SillyTavern. Dự án được phát triển nhằm mục đích giải quyết những khiếm khuyết nội tại của các Mô hình Ngôn ngữ Lớn (LLMs) trong môi trường nhập vai (Roleplay - RP).

Khác với việc chỉ cung cấp các hệ thống thẻ nhân vật (Character Cards) tĩnh, ST Anima trang bị cho AI một **cơ thể sinh lý ảo** và **hệ thống tư duy phân tách**. Điều này biến nhân vật từ một bộ máy phản hồi văn bản thụ động thành một thực thể "sống" có khả năng ghi nhớ dài hạn, có sự biến thiên về cảm xúc sinh hóa, và có nhận thức về môi trường xung quanh.

## 2. KIẾN TRÚC VÀ CƠ CHẾ HOẠT ĐỘNG (HOW)

Hệ thống được thiết kế theo kiến trúc Module (v10.0), bao gồm các phân hệ (Engines) cốt lõi vận hành độc lập nhưng tương tác chặt chẽ với nhau:

### 2.1. Cỗ Máy Nội Tiết & Sinh Lý (Hormone & Vitals Engine)
Thay vì sử dụng các chỉ thị trạng thái cứng (hard-coded prompts) để ép AI thể hiện cảm xúc, Anima mô phỏng thời gian thực hệ thống nội tiết với **8 loại chất dẫn truyền thần kinh** (bao gồm Dopamine, Adrenaline, Cortisol, Serotonin, v.v.).
- **Thuật toán áp dụng:** Sử dụng phương trình Hill (Hill Equation) để tính toán ngưỡng bão hòa sinh hóa, kết hợp với cơ chế phân rã tuyến tính (Decay) theo thời gian.
- **Kết quả:** Trạng thái sinh lý (nhịp tim, huyết áp, năng lượng, mức độ đau đớn) sẽ quyết định trực tiếp đến hành vi của nhân vật. Một nhân vật có nồng độ Cortisol cao sẽ tự động biểu hiện sự căng thẳng trong văn xuôi mà không cần người dùng can thiệp.

### 2.2. Cơ Chế Ký Ức Động (Dynamic Memory Architecture)
Khắc phục tình trạng AI bị "tràn bối cảnh" hoặc quên lãng bất hợp lý, Memory Engine mô phỏng cơ chế hoạt động của não người:
- **Ký ức ngắn hạn (STM):** Bị phân rã theo **Đường cong Quên lãng Ebbinghaus**. Những thông tin không quan trọng sẽ bị phai mờ.
- **Ký ức dài hạn (LTM):** Được hợp nhất dựa trên nguyên lý **Hebbian** ("Những nơ-ron cùng phát xung sẽ liên kết với nhau"). Khi người dùng giao tiếp, thuật toán **Jaccard Similarity** sẽ quét và truy xuất (Recall) những ký ức liên quan nhất để đưa vào bộ nhớ làm việc.

### 2.3. Pha Nhận Thức Phân Tách (Cognitive Spec 002 - AD Phase)
Đây là một bước đột phá trong thiết kế luồng xử lý:
- Hệ thống sử dụng một mô hình ngôn ngữ phụ, chi phí thấp (như Gemini Flash Lite) đóng vai trò làm **Tác nhân Tiềm thức (Subconscious Agent)**.
- Khi người dùng gửi tin nhắn, Tác nhân Tiềm thức sẽ chạy ngầm để phân tích ý định, chọn cảm xúc, và quyết định việc sử dụng công cụ (Tools) *trước khi* mô hình RP chính phản hồi.
- Phân tích này được tiêm vào LLM chính dưới định dạng thẻ XML (định danh bằng thẻ nội bộ `<animaing>`) để định hướng lối suy nghĩ thầm kín (Chain of Thought), đảm bảo đầu ra luôn logic và có chiều sâu tâm lý.

### 2.4. Giao Diện Tự Phục Hồi (DOM Auto-Healing UI)
Để tích hợp mượt mà vào giao diện mặc định của SillyTavern mà không làm gián đoạn trải nghiệm người dùng, ST Anima áp dụng kỹ thuật tiêm DOM:
- Thuật toán `MutationObserver` liên tục theo dõi các thay đổi trên giao diện. 
- Hệ thống tự động bóc tách các thẻ nội bộ (như `<animaing>`, `<action>`, `<dialogue>`) hoặc phân tích văn xuôi tự nhiên để bọc chúng trong các CSS Class mang phong cách Visual Novel (bong bóng thoại, nhãn dán môi trường, âm thanh).
- Đặc biệt, hệ thống xử lý triệt để hiện tượng "tin nhắn rỗng" do các bộ lọc native XML của nền tảng gây ra bằng cách nới lỏng các ràng buộc cú pháp và chèn văn bản dự phòng tinh tế (`*...*`).

## 3. CƠ SỞ KHOA HỌC VÀ LÝ DO PHÁT TRIỂN (WHY)

Sự ra đời của dự án ST Anima xuất phát từ ba nhu cầu thực tiễn:

1. **Khắc Phục Giới Hạn Vật Lý Của LLM:** LLM bẩm sinh không có tính hằng tồn khách thể (Object Permanence) và không có cảm nhận sinh lý (Somatosensory). Nếu người dùng đấm nhân vật AI, nhân vật có thể kêu đau ở tin nhắn đó nhưng sẽ "quên" hoàn toàn và vui vẻ trở lại ở 2 tin nhắn sau. ST Anima giải quyết triệt để điều này thông qua Cỗ máy Nội tiết.
2. **Loại Bỏ Tính Dự Đoán (Predictability):** Sự rập khuôn của AI đến từ việc thiếu đi các biến số ngẫu nhiên có kiểm soát. Việc áp dụng các thông số hormone, năng lượng, hay cơn thèm ăn tạo ra các chu kỳ sinh học (Circadian Rhythm). Nhân vật có thể vô cớ cáu gắt vì đói, hoặc trở nên mất tập trung do thiếu ngủ.
3. **Tối Ưu Hóa Chi Phí Lập Luận:** Thay vì ép mô hình RP đắt tiền phải thực hiện cả việc lập luận tâm lý lẫn việc sinh văn bản nghệ thuật cùng lúc, pha nhận thức phân tách (AD Phase) chuyển giao phần lập luận cho một mô hình nhẹ hơn. Nhờ đó, chất lượng văn chương được cải thiện rõ rệt mà vẫn đảm bảo tính nhất quán của cốt truyện.

---
*Báo cáo được biên soạn bởi: Antigravity*
*Bản quyền phân tích thuộc về dự án ST Anima.*
