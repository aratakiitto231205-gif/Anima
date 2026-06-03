# Kế hoạch Triển khai Anima Engine v7.0: Somatosensory & Autonomous Idle Life Simulator

Kế hoạch này thiết lập **Trục Sinh lý Lâm sàng & Giả lập Đời sống Tự trị (Circadian Somatosensory & Idle Life Simulator)** cho **Anima Engine v7.0**. Nhân vật sẽ có các chỉ số sinh tồn y học thực tế và tự trải nghiệm cuộc sống riêng của mình (Tamagotchi Companion) khi người dùng vắng mặt.

---

## 🎭 Tầm Nhìn Hoạt Động (User Vision)

1. **AI Tự hành khi vắng mặt (Idle Life Simulator)**: Khi người dùng đi vắng (thời gian thực tế trôi qua $\ge 3$ tiếng) hoặc khi dịch chuyển thời gian kể chuyện kể trên UI, nhân vật không chỉ đứng yên phân rã hormone thụ động. AI sẽ tự động kích hoạt **Trí tưởng tượng Tự trị**, tự do trải qua các câu chuyện đời thường hoặc kịch tính (ví dụ: Itto đi đấu bọ Kabuto thắng/thua, ngã xe, đi mua đồ ăn...) và tự cập nhật các chấn thương/ký ức tương ứng.
2. **User quay lại**: Dashboard hiển thị nhật ký câu chuyện tự trị của nhân vật khi vắng mặt. Nhân vật sẽ **tự động ghi nhớ** sự kiện đó và tự sự trong tin nhắn tiếp theo một cách tự nhiên (ví dụ: xoa đầu tay bị xước khoe chiến tích cứu mèo).
3. **Các chỉ số sinh tồn lâm sàng**: Dashboard hiển thị nhịp tim nhấp nháy, huyết áp, nhịp thở, nhiệt độ cơ thể chân thực và liên kết hữu cơ trực tiếp với hormone thần kinh.

---

## Proposed Changes

### 1. Lõi Nhận thức Lâm sàng (`CognitiveAgent.js`)

#### [MODIFY] [CognitiveAgent.js](file:///d:/silly/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/cognitive-dashboard/CognitiveAgent.js)

* **Mở rộng Hệ thống Sinh lý Lâm sàng (Somatosensory Axis)**:
  * **Các chỉ số sinh tồn (Vital Signs)**:
    * `heart_rate` (Nhịp tim): Baseline $75$ bpm. Tăng theo Adrenaline/Stress lên $120 - 150$ bpm, giảm khi ngủ.
    * `blood_pressure` (Huyết áp): Baseline $120/80$ mmHg. Tăng theo Cortisol/Adrenaline lên $150/95$ mmHg.
    * `body_temp` (Nhiệt độ): Baseline $36.8^\circ\text{C}$. Tăng khi nhiễm trùng/chấn thương lên $38.5^\circ\text{C} - 39.5^\circ\text{C}$.
    * `resp_rate` (Nhịp thở): Baseline $16$ bpm. Tăng theo nhịp tim và stress.
  * **Cảm giác cơ thể sâu sắc (Somatic Sensations)**:
    * `bladder` (Buồn đi tiểu): Tăng tự nhiên theo chu kỳ.
    * `nausea` (Buồn nôn): Tăng khi say rượu hoặc ăn đồ dị ứng.
    * `dyspnea` (Khó thở): Tăng khi nhịp tim quá cao hoặc chấn thương ngực.
    * `temp_sensation` (Cảm giác nhiệt độ): Nóng/Lạnh dựa trên ngoại cảnh.
    * `pain` (Cơn đau): 0 - 10 hữu cơ.
    * `energy` (Năng lượng): 0 - 10 hữu cơ.
* **Liên kết Sinh học Lâm sàng (Organic Circadian Loop)**:
  * Nhịp tim nhấp nháy động tỉ lệ thuận với Adrenaline và tỉ lệ nghịch với Melatonin.
  * Huyết áp tăng vọt khi Cortisol và Adrenaline cùng cao.
  * Nhiễm độc rượu (`Intoxication`) tăng Dopamine nhưng làm tăng Melatonin và gây Nausea.
* **Bàn giao quyền tự quyết chỉ số cho AI**:
  * AI trực tiếp cập nhật các chỉ số sinh lý trong thẻ `<body_update>` dưới dạng key-value đơn giản:
    `<body_update>pain: 3.5, heart_rate: 110, injury: "Vết bầm ở vai trái do ngã xe"</body_update>`
  * Phân tích và nạp trực tiếp giá trị sinh lý vào `agent.body_status` mà không dùng parser từ khóa máy móc.

---

### 2. Giả lập Đời sống Tự trị (`index.js`)

#### [MODIFY] [index.js](file:///d:/silly/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/cognitive-dashboard/index.js)

* **Idle Life Simulator Engine (`processIdleLifeCycle`)**:
  * Khi phát hiện thời gian không tương tác thực tế hoặc Narrative Time Jump $\ge 180$ phút (3 tiếng):
    * Gọi API ẩn chạy ngầm hoặc giả lập prompt để AI tự phát sinh một **Nhật ký Đời sống tự trị (Idle Chronicle Log)**.
    * Nhân vật sẽ tự quyết định vết thương, kỷ niệm, hoặc bài học đã xảy ra trong lúc User vắng mặt.
    * Ký ức này được lưu vào ngăn kéo dài hạn LTM để nhân vật tự động "sực nhớ" và kể lại cho người dùng khi gặp mặt.
    * Hiển thị nhật ký sự kiện này thành một thông báo Toastr tuyệt đẹp trên giao diện khi người dùng mở lại chat.
* **Circadian Ticker chạy ngầm**:
  * Tự động tăng nhẹ chỉ số đói, khát, bladder của nhân vật mỗi 45 giây chạy ngầm theo chu kỳ sống.

---

### 3. Giao diện Tamagotchi Dashboard (`template.html`)

#### [MODIFY] [template.html](file:///d:/silly/SillyTavern-Launcher/SillyTavern/public/scripts/extensions/third-party/cognitive-dashboard/template.html)

* **Bản theo dõi sinh tồn Lâm sàng (Clinical Vital Signs Panel)**:
  * Bổ sung màn hình theo dõi chỉ số sinh tồn nhấp nháy y khoa:
    * `Heart Rate`: Nhấp nháy theo nhịp tim bpm thực tế.
    * `Blood Pressure`: Hiển thị huyết áp mmHg.
    * `Body Temp`: Hiển thị nhiệt độ cơ thể $^\circ\text{C}$.
    * `Resp Rate`: Hiển thị nhịp thở/phút.
  * Bổ sung 6 thanh tiến trình sinh lý tròn/ngắn (Đau đớn, Năng lượng, Buồn tiểu, Buồn nôn, Đói, Khát).
* **Nhật ký Đời sống Tự trị (Idle Companion Chronicles)**:
  * Thêm ô nhật ký hiển thị sự kiện nhân vật đã tự trải qua khi bạn đi vắng.

---

## Verification Plan

### Automated Tests
* Viết script test `test_idle_life.js` kiểm thử:
  1. Mô phỏng khoảng thời gian vắng mặt 6 tiếng, kích hoạt Idle Life Generator sinh ra sự kiện tự sự ngẫu nhiên.
  2. Kiểm tra nhịp tim tăng vọt tương ứng với Adrenaline cao.
  3. Kiểm tra cơ chế tự chữa lành vết thương khi có time jump.

### Manual Verification
* Tắt chat đi chơi 4 tiếng, quay lại mở SillyTavern để xem nhân vật kể về câu chuyện tự trị của mình và xem các thanh sinh tồn lâm sàng biến đổi sinh động.
