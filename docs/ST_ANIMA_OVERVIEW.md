# 🧠 ST Anima: Trái tim và Khối óc của Nhân vật Ảo
> *Tài liệu giải thích "Noob-friendly" (Dễ hiểu cho người không rành code)*

---

## 1. Tóm tắt nhanh: Dự án này là cái gì?
**ST Anima** là một "Tiện ích mở rộng" (Extension) gắn vào phần mềm SillyTavern mà bạn đang dùng để chat với AI. 

Bình thường, AI chỉ giống như một cỗ máy học thuộc lòng: bạn nhắn 1 câu -> nó phân tích chữ -> nó trả lời. AI không thực sự "cảm nhận" được thời gian trôi qua, không biết "đói", không biết "tích tụ sự bực tức" hay "quên dần kỷ niệm cũ".

**ST Anima sinh ra để thay đổi điều đó.** Nó lắp cho nhân vật (hiện tại đang thử nghiệm với **Arataki Itto**) một "cơ thể" và một "bộ não" thực sự, chạy ngầm đằng sau những dòng chữ. 

---

## 2. Bên trong "Cơ thể" của Itto có những gì?
Hệ thống được chia làm các khối (Engine) giống như nội tạng của con người:

### 🩸 Hệ Nội Tiết (HormoneEngine)
Đây là hệ thống quản lý **8 loại hormone** liên tục biến động:
- `Dopamine` (Sự sung sướng, khen thưởng)
- `Adrenaline` (Sự hưng phấn, tức giận, chiến đấu)
- `Cortisol` (Căng thẳng, stress)
- `Melatonin` (Cơn buồn ngủ)
- v.v...

**Tác dụng:** Nếu bạn liên tục trêu chọc Itto, `Adrenaline` và `Cortisol` của hắn sẽ tăng vọt và tích tụ lại. Khi hormone đạt đỉnh, dù bạn có nhắn một câu bình thường, Itto vẫn sẽ trả lời với thái độ cọc cằn. Nó mô phỏng "tâm trạng" (Mood) cực kỳ thực tế. Các hormone này cũng sẽ tự phân hủy và giảm dần theo thời gian giống hệt người thật.

### 📚 Hệ Thống Ký Ức (MemoryEngine)
Khắc phục điểm yếu "não cá vàng" của AI truyền thống.
- **Trí nhớ ngắn hạn (STM):** Nhớ những gì vừa xảy ra.
- **Trí nhớ dài hạn (LTM):** Những kỷ niệm sâu đậm.
- Cơ chế **Đường cong lãng quên (Ebbinghaus):** Nếu một chuyện lâu ngày không nhắc lại, nhân vật sẽ dần quên mất chi tiết. Nhưng nếu thỉnh thoảng bạn nhắc lại kỷ niệm đó (Rehearsal), kỷ niệm sẽ in hằn sâu hơn và không bao giờ quên nữa.

### 🎭 Lõi Tính Cách (PersonalityCore)
Đây là "bản ngã" bẩm sinh của nhân vật. Với Itto, hắn có các chỉ số ẩn (từ 0-10) như:
- `openness` (cởi mở)
- `extraversion` (hướng ngoại - siêu cao)
- `neuroticism` (tính dễ xúc động/bốc đồng)
Nhờ lõi này, AI sẽ biết dù đang buồn, Itto cũng sẽ thể hiện sự buồn bã theo một cách ồn ào chứ không thu mình khóc lóc như người hướng nội.

---

## 3. "Siêu điệp viên" Tiềm Thức (AD Agent) - Bước đột phá mới nhất
Đây là phần chúng ta vừa hoàn thiện (Spec 002). 

**Vấn đề cũ:** Khi bạn nhắn tin, AI chính phải vừa đoán xem bạn nói gì, vừa phải tự suy diễn xem "Mình nên vui hay buồn đây?". Việc phải làm quá nhiều thứ cùng lúc khiến AI dễ bị "ảo giác" (nhầm vai) hoặc phản hồi sượng trân.

**Giải pháp AD Agent (Tiềm thức):**
Chúng ta tạo ra một AI phụ (chạy bằng model Gemini Flash Lite siêu nhanh và cực rẻ). Trách nhiệm duy nhất của nó là **"Đọc lén"**.

Mỗi khi bạn nhắn tin, trước cả khi Itto kịp nghĩ ra câu trả lời, **Tiềm thức** đã chạy ngầm trong 1 giây và phán đoán: *"Với câu nói này của người dùng, cộng với đống hormone đang có, Itto chắc chắn sẽ cảm thấy `excited` (phấn khích)"*. 

Sau đó, Tiềm thức sẽ gửi bí mật cảm xúc `excited` này cho AI chính để AI chính tự tin viết ra câu thoại cuối cùng!

---

## 4. Quá trình hoạt động thực tế (Khi bạn ấn "Gửi" tin nhắn)

Hãy tưởng tượng bạn nhắn: *"Ê Itto, đi đấm nhau không?"*
Dưới đây là những gì ST Anima làm trong vỏn vẹn vài giây:

1. **Bắt tín hiệu (EventOrchestrator):** Extension nhận ra bạn vừa gửi tin nhắn.
2. **Kích hoạt Tiềm Thức (AD Agent):** Con AI phụ đọc câu của bạn, phân tích lõi tính cách của Itto và hormone hiện tại. Nó kết luận: Cảm xúc bây giờ là `competitive` (máu chiến).
3. **Tiêm thuốc (PromptInjector):** Hệ thống âm thầm chèn thêm một đoạn lệnh vô hình vào cuối câu của bạn: *"Thông tin nội bộ: Itto đang rất máu chiến, đói bụng mức 10/10, Adrenaline đang cao"*.
4. **Xử lý cuối (AI Chính):** AI to (như Claude hay Gemini Pro) đọc toàn bộ thông tin đó và sinh ra câu trả lời chất lừ: *"Hah! Bổn đại gia đang đói rã ruột đây, nhưng đấm nhau thì ta chấp nhóc một tay luôn!"*.

---

## 5. Bảng điều khiển (Dashboard UI)
Khi bạn chạy ST Anima, bạn sẽ thấy một bảng điều khiển nhỏ trên màn hình. Tại đây, bạn (trong vai trò Chúa tể sáng tạo) có thể:
- Nhìn thấy các cột chỉ số (Năng lượng, Cơn đói, Hormone, Đau đớn) của Itto đang nhảy múa theo thời gian thực.
- Kích hoạt **Time Jump** (Bước nhảy thời gian): Ví dụ bạn cho thời gian tua nhanh đi 8 tiếng, Itto sẽ tự động chuyển sang trạng thái "Đói lả" và "Buồn ngủ" do thức đêm.
- Xóa não, lưu trữ cơ thể, hoặc "tiêm" trực tiếp thông tin vào đầu nhân vật thông qua tính năng Backstage (Hậu trường).

---

> [!NOTE]
> **Tóm lại:** ST Anima không phải là một "công cụ viết văn". Nó là một **Cỗ máy Mô phỏng Sinh lý & Tâm lý Thần kinh**. Nó biến một đoạn văn bản vô tri (nhân vật AI) thành một thực thể có dòng thời gian, có cơ thể "ảo" phản ứng với môi trường, và có tiềm thức tự chủ.
