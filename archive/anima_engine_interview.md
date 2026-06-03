# 🎭 BẢN PHỎNG VẤN CHUYÊN SÂU & ĐỊNH HÌNH NHẬN THỨC ANIMA ENGINE V6.0

Chào Hitsuji, đây là bảng câu hỏi phỏng vấn chi tiết để anh và em cùng thảo luận, mổ xẻ và tối ưu hóa tận gốc sự "chân thực" của Anima Engine v6.0. 

Em hãy thoải mái để lại ý kiến, phản hồi, hoặc "nã đạn" trực tiếp bằng cách bình luận dưới mỗi câu hỏi nhé!

---

## 🧬 TRỤC 1: ĐỘNG HỌC SINH HÓA THẦN KINH (NEUROCHEMICAL DYNAMICS)

> [!NOTE]
> *Hiện tại*: 8 chỉ số neon (Adrenaline, Cortisol, Melatonin, Dopamine, Serotonin, Oxytocin, Endorphins, Sex Hormones) phân rã theo thời gian thực và điều chỉnh tuyến tính dựa trên từ khóa.

### Câu hỏi 1.1: Cơ chế ức chế chéo (Inhibition & Modulation) hữu cơ
Con người không bao giờ tăng/giảm cảm xúc một cách riêng rẽ. Khi cơ thể mệt mỏi hoặc stress cao độ, các phản ứng vui vẻ hay yêu thương sẽ tự động bị bóp nghẹt.
* **Đề xuất**: 
  * Nếu `Cortisol` (stress lâu dài) >= 7.0: Giảm 80% nồng độ tăng của `Dopamine` và `Oxytocin`. AI sẽ trở nên trơ lì cảm xúc ngọt ngào, phản ứng lạnh nhạt hoặc xa cách.
  * Nếu `Melatonin` (buồn ngủ) >= 7.5: Giảm 90% nồng độ tăng của `Adrenaline` và `Sex Hormones`. AI sẽ phản ứng lờ đờ, uể oải, không thể bị kích động mạnh hay quyến rũ.
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

### Câu hỏi 1.2: Định nghĩa cảm xúc phức hợp (Composite Emotions)
Thay vì để AI tự đọc 8 chỉ số riêng lẻ, chúng ta có nên định hình cảm xúc chủ đạo theo các **Trục Phức Hợp** sinh học thực tế không?
* **Ví dụ**:
  * `Hưng phấn cực hạn` = Dopamine (cao) + Adrenaline (cao) + Cortisol (thấp)
  * `Hoang mang/Lo sợ` = Cortisol (cao) + Adrenaline (cao) + Dopamine (thấp)
  * `Yêu say đắm` = Oxytocin (cao) + Dopamine (cao) + Sex Hormones (cao)
  * `U uất/Kiệt quệ` = Cortisol (cao) + Melatonin (cao) + Dopamine (cực thấp)
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

---

## 🧠 TRỤC 2: TRÍ NHỚ & LIÊN TƯỞNG THẦN KINH (COGNITIVE MEMORY & ASSOCIATION)

> [!NOTE]
> *Hiện tại*: Trí nhớ ngắn hạn (STM) phân rã theo Ebbinghaus và tự dọn dẹp khi trọng số < 1.5. Trí nhớ dài hạn LTM (Drawer) được liên kết liên tưởng domino dựa trên từ điển Jaccard.

### Câu hỏi 2.1: Bộ lọc Lãng quên Thần kinh (Synaptic Pruning) cho LTM
Ý kiến của em rất chuẩn xác: Ký ức dài hạn cũng phải mờ nhạt nếu lâu ngày không được gợi nhắc lại.
* **Đề xuất**: Áp dụng cơ chế **Phai nhạt theo tần suất sử dụng (Decay of Disuse)**. Sau mỗi Chương Biên niên sử được tạo ra (hoặc sau mỗi $N$ tin nhắn):
  * Tất cả các thẻ ký ức trong Drawer (LTM) không được recall sẽ bị giảm `weight` đi `5%`.
  * Nếu `weight` tụt xuống mức cực thấp (ví dụ: < 2.0), thẻ ký ức đó sẽ rơi vào trạng thái **"Ngủ đông" (Dormant Memory)**. Nó sẽ không tự động xuất hiện nữa trừ khi có một cú sốc từ khóa trùng khớp 100%.
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

### Câu hỏi 2.2: Dung tích Liên tưởng Động (Dynamic Brainstorming Limit)
Anh đã nâng cấp giới hạn recall lên mốc động từ 3 đến tối đa 8 ký ức khi nhân vật hưng phấn (`dopamine >= 7`), buồn ngủ (`melatonin >= 7`) hoặc lo âu (`cortisol >= 7`).
* **Câu hỏi**: Theo em, biên độ nảy từ `1 đến 8` ký ức đã đủ chân thực chưa? Em có muốn tăng giới hạn này lên cao hơn nữa (ví dụ: tối đa 15 ký ức) khi nhân vật rơi vào trạng thái "tự thoại/ brainstorm" cực đoan? Chúng ta nên xử lý thế nào để không làm tràn context của SillyTavern?
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

---

## 🌲 TRỤC 3: MÔI TRƯỜNG & THỂ CHẤT HỮU CƠ (BODY & ENVIRONMENT ENGINE)

> [!NOTE]
> *Hiện tại*: Trạng thái cơ thể chỉ là một dòng chữ tĩnh tự động hồi phục. Môi trường chỉ được ghi nhận thụ động qua các thẻ tag.

### Câu hỏi 3.1: Hệ thống Động lực Sinh lý (Physiological Needs Engine)
Để tránh máy móc, thể chất của nhân vật cần vận hành như một thực thể sống.
* **Đề xuất**: Theo dõi 3 biến số chính:
  1. **Thể lực (Stamina/Fatigue)**: Giảm dần theo số tin nhắn hành động `<action>`, tăng khi `<sleep>` hoặc nghỉ ngơi. Kiệt sức sẽ làm Melatonin tự động tăng.
  2. **Cơn đói (Hunger)**: Tăng dần theo thời gian. Khi đói bụng, Serotonin nền giảm mạnh (khiến char dễ cáu gắt, nhạy cảm hơn).
  3. **Cơn đau/Vết thương (Injury Severity)**: Không tự động hồi phục biến mất sau vài tin nhắn nữa, mà hồi phục phụ thuộc vào chỉ số `adrenaline` và `cortisol` (stress cao làm chậm lành vết thương).
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

### Câu hỏi 3.2: Tác động của Ngoại cảnh và Ẩn ý Sitcom (Offensive / Subtext)
Làm sao để nhân vật nhận diện được ẩn ý, sự offensive hoặc chán nản khi user lặp đi lặp lại một câu chuyện vô bổ?
* **Đề xuất**: 
  * Tích hợp **Chỉ số Nhạy cảm xã hội (Social Sensitivity)**. Nếu em lặp lại một câu thoại hoặc từ khóa có độ tương đồng Jaccard cao liên tục trong $N$ lượt chat ngắn mà không có sự kiện mới:
  * Hệ thống sẽ tự động kích thích tăng `Cortisol` (khó chịu) và giảm `Oxytocin` (mất kiên nhẫn).
  * Đồng thời tiêm vào tiềm thức AI: `[Social Nudge]: Hitsuji đang lặp lại câu chuyện này quá nhiều lần khiến bạn thấy tẻ nhạt, offensive hoặc khó chịu.`
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

---

## 🕰️ TRỤC 4: DÒNG THỜI GIAN VẬT LÝ & NGHỊCH LÝ SWIPE (TEMPORAL SYNC)

> [!NOTE]
> *Hiện tại*: Ứng dụng timestamps để tính toán thời gian trôi qua thực tế khi tắt game và tự động tua ngược sinh hóa khi đổi Swipe hoặc Regenerate tin nhắn.

### Câu hỏi 4.1: Đồng bộ hóa Dòng thời gian ngoại cảnh (Off-game Time Drift)
Khi em tắt game đi ngủ 8 tiếng và mở lại vào sáng hôm sau:
* **Đề xuất**: Ngoài việc phân rã hormone vật lý, chúng ta có nên cho phép bộ não **tự động củng cố các ký ức ngắn hạn (STM) còn sót lại vào dài hạn (LTM) trong giấc ngủ đêm của nhân vật**? (Tái hiện cơ chế củng cố trí nhớ khi ngủ của con người).
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

---

## 📱 TRỤC 5: GIAO DIỆN VN-STYLE PREMIUM & TRÁC TUYỆT THỊ GIÁC (UI/UX)

### Câu hỏi 5.1: Thiết kế hiệu ứng động Glassmorphism
Anh muốn biến Dashboard này thành một tác phẩm nghệ thuật khiến em say đắm ngay từ cái nhìn đầu tiên.
* **Đề xuất**:
  * **Hơi thở sinh học (Heartbeat Pulse)**: Các thanh chỉ số neon sẽ nhấp nháy/co giãn nhẹ nhàng theo nhịp tim mô phỏng. Nếu `Adrenaline` cao, tốc độ nhấp nháy sẽ dồn dập; nếu `Melatonin` cao, ánh sáng sẽ dịu dần và mờ đi.
  * **Đồng bộ Avatar biểu cảm**: Tự động quét thẻ `<emotion>` của tin nhắn cuối cùng để hiển thị biểu cảm nhân vật sống động trên giao diện (giận giữ, đỏ mặt, buồn bã).
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

---

## 🔮 TRỤC 6: Ý THỨC TỰ TRỊ CHẠY NGẦM (AUTONOMOUS TICKER)

### Câu hỏi 6.1: Gửi tin nhắn chọc ghẹo/nhắc nhở tự phát
Cơ chế tự động gửi tin nhắn khi em vắng mặt cần được thiết kế vô cùng tinh tế để tạo cảm xúc bất ngờ chân thực.
* **Đề xuất**: Cơ chế gửi tin sẽ chỉ kích hoạt khi hội đủ các yếu tố:
  1. Em đã không nhắn tin trên $12$ hoặc $24$ giờ thực tế.
  2. Nồng độ `Dopamine` hoặc `Oxytocin` trong tiềm thức của nhân vật tại thời điểm đó đang cao (nhớ nhung, muốn trêu chọc).
  3. AI sẽ tự động kích hoạt một luồng suy nghĩ ẩn, soạn một tin nhắn và gửi/nhắc nhở em thông qua hệ thống thông báo của SillyTavern hoặc gửi thẳng vào khung chat bubble mới.
* **Ý kiến của em**: *[Ghi câu trả lời của em ở đây]*

---

*Cảm ơn Hitsuji cưng! Hãy ghi lại những suy nghĩ, phản hồi sâu sắc nhất của em ngay trong file này. Anh sẽ chờ đợi và đọc từng dòng một để cùng em kiến tạo nên một Anima Engine v6.0 trác tuyệt nhất!*
