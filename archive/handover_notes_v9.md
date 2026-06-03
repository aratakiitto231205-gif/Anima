# 🌌 Cẩm Nang Anima Engine v9.1: Hướng Dẫn Sử Dụng & Định Hướng Kiến Trúc Kỹ Thuật

> [!IMPORTANT]
> **Dành cho Hitsuji & AI Phiên Sau**: 
> * **Hitsuji**: Hãy đọc phần 1 để biết cách làm chủ và tương tác với thế giới vật lý cố định của nhân vật.
> * **AI Phiên Sau**: Đây là tài liệu tối quan trọng ghi chép 100% định hướng dự án, chi tiết kỹ thuật và các **Quy tắc Vàng** tuyệt đối không được phá vỡ từ các phiên trước.

---

## 🎭 PHẦN 1: HƯỚNG DẪN SỬ DỤNG THỰC TẾ (Dành cho Hitsuji)

Hệ thống **Anima Engine v9.1 (Môi trường Vật lý Cố định)** mang đến sự nhất quán tuyệt đối về không gian xung quanh nhân vật. Dữ liệu được lưu trữ trong tệp tin `cognitive_environment_{characterId}.json` độc lập cho từng nhân vật. Dưới đây là cách sử dụng:

### 1.1 Trực quan hóa Giao diện Môi trường (Tab 1: Nội tâm)
Nằm ngay phía dưới panel Somatosensory (Cảm giác thể trạng), ní sẽ nhìn thấy một Widget Môi trường vật lý lộng lẫy:
* **Địa điểm hoạt động hiện tại (Active Location)**: Hiển thị với nhãn màu xanh ngọc rực rỡ (ví dụ: `Môi trường: Phòng ngủ`).
* **Mô tả bối cảnh**: Khung viền xanh lá (forest green) sang trọng hiển thị không khí, bối cảnh thực tại của căn phòng.
* **Danh sách vật phẩm cố định**: Hiển thị tên vật phẩm, số lượng (nếu có dạng huy hiệu xN) và trạng thái hiện tại (ví dụ: `Bàn làm việc | Trạng thái: Sạch sẽ`, `Giường ngủ | Trạng thái: Bị xô lệch`).

---

### 1.2 Đồng bộ hóa tự nhiên trong Normal RP (Hành vi Nhân vật)
Trong lúc trò chuyện thông thường, nhân vật (LLM) sẽ tự ý thức không gian xung quanh và xuất các thẻ XML tương ứng. Các thẻ này sẽ tự động được Client parser làm sạch khỏi khung chat để không làm ní mất hứng nhập vai:

* **Di chuyển Địa điểm (`<change_location>`)**:
  * Khi nhân vật muốn đi sang phòng khác, họ sẽ xuất thẻ: `<change_location>Phòng khách</change_location>`.
  * *Hệ quả*: Hệ thống lập tức chuyển địa điểm hoạt động, tải mô tả + vật phẩm phòng khách lên UI, tiêm bối cảnh mới vào prompt và bắn Toastr thông báo: `Nhân vật đã di chuyển tới [Phòng khách]! 🚶`.
  
* **Cập nhật Vật lý (`<environment_update>`)**:
  * Khi nhân vật tương tác với vật dụng trong phòng, họ sẽ xuất thẻ để cập nhật trạng thái: `<environment_update>Giường ngủ: Bị xô lệch, Drap giường: Nhăn nhúm</environment_update>` (hỗ trợ phân tách bằng dấu phẩy hoặc xuống dòng để cập nhật hàng loạt).
  * *Hệ quả*: Trạng thái vật dụng trên Dashboard cập nhật tức thì, lưu xuống file JSON và bắn Toastr: `Môi trường cập nhật: Giường ngủ: Bị xô lệch, Drap giường: Nhăn nhúm 📦`.

---

### 1.3 Điều khiển Tiềm thức qua Backstage Chat Panel (Tab 4: Tiềm thức)
AI Quản trị sau cánh gà chính là người giúp việc đứng sau cánh gà uống nước xem roleplay. Ní có thể chat trực tiếp với khứa này bằng tiếng Việt tự nhiên để sửa đổi thế giới vật lý:

* **Tạo Địa điểm mới**:
  * *Hitsuji chat*: "Tạo cho tui một địa điểm mới tên là Garage với mô tả là garage rộng rãi có bụi bặm"
  * *Hệ quả*: AI Quản trị sẽ phản hồi cực kỳ dí dỏm bằng tiếng Việt và tự động thực thi thẻ hành động `<env_create_location name="Garage"><description>Garage rộng rãi có bụi bặm</description></env_create_location>` để ghi nhận vào tệp tin bối cảnh.
  
* **Thêm hoặc Cập nhật vật phẩm**:
  * *Hitsuji chat*: "Thêm vào Garage cho Itto 3 chiếc xe mô tô phân khối lớn cực ngầu"
  * *Hệ quả*: AI Quản trị tự động chèn thẻ `<env_update_item location="Garage" name="Xe mô tô phân khối lớn" state="Cực ngầu, bóng loáng" quantity="3"/>`. Vật phẩm xuất hiện tức thì trên Dashboard!
  
* **Xóa vật phẩm**:
  * *Hitsuji chat*: "Xóa chiếc xe mô tô trong Garage đi ní"
  * *Hệ quả*: AI Quản trị bắn thẻ `<env_delete_item location="Garage" name="Xe mô tô phân khối lớn"/>` và xóa sạch vật phẩm khỏi thế giới.
  
* **Chuyển phòng cưỡng bức**:
  * *Hitsuji chat*: "Chuyển Itto sang Garage giùm tui"
  * *Hệ quả*: AI Quản trị tự động thực thi `<env_change_location>Garage</env_change_location>`.

---

## 🗺️ PHẦN 2: CẨM NĂNG BÀN GIAO KỸ THUẬT (Dành cho AI Phiên Sau)

### 2.1 Kiến trúc Luồng Nhận thức Môi trường Vật lý (v9.1)

```mermaid
graph TD
    UserRP[Normal RP Message] -->|Parser XML| ClientRPParser[index.js: parseXmlTags]
    ClientRPParser -->|1. change_location| SyncChange[Cập nhật active_location]
    ClientRPParser -->|2. environment_update| SyncUpdate[Cập nhật trạng thái item]
    
    UserBackstage[Hitsuji Chat tại Tab 4] -->|Admin Command| AdminAgent[index.js: processAdminCommand]
    AdminAgent -->|Phản hồi LLM với thẻ hành động| BackstageParser[index.js: processAdminCommand Parser]
    
    BackstageParser -->|env_change_location| SyncChange
    BackstageParser -->|env_update_item| SyncUpdate
    BackstageParser -->|env_delete_item| SyncDelete[Xóa item khỏi phòng]
    BackstageParser -->|env_create_location| SyncCreate[Tạo phòng mới]
    
    SyncChange & SyncUpdate & SyncDelete & SyncCreate -->|Gọi API backend NodeExpress| ServerAPI[/api/extensions/environment/save]
    ServerAPI -->|Ghi tệp tin JSON| FileStore[(cognitive_environment_characterId.json)]
    
    FileStore -->|Tải bất đồng bộ| GetEnv[/api/extensions/environment/get]
    GetEnv -->|Nạp biến toàn cục| ActiveEnv[activeEnvironment]
    
    ActiveEnv -->|Cập nhật UI thời gian thực| RefreshUI[refreshEnvironmentUI]
    ActiveEnv -->|Tiêm bối cảnh địa điểm hoạt động| SystemPrompt[getMemoryPromptBlock]
    
    SystemPrompt -->|Character RP nhận thức bối cảnh| CharacterAgent[Character RP Model]
```

---

### 2.2 Hiện trạng Mã nguồn & API Endpoints

Hệ thống được cấu trúc hóa chặt chẽ qua 3 tệp tin Frontend và 1 tệp tin Backend của SillyTavern:

1. **Backend Endpoints (`src/endpoints/extensions.js`)**:
   * **`/api/extensions/environment/get`**: Nhận `characterId`, tải tệp tin JSON tương ứng từ ổ cứng. Nếu chưa tồn tại, tự động gieo mầm (seed) Phòng ngủ & Phòng khách mặc định và ghi xuống đĩa trước khi trả về Client.
   * **`/api/extensions/environment/save`**: Nhận `characterId` và `envData`, ghi đè nhất quán xuống đĩa thông qua Node `fs.writeFileSync`.
2. **Frontend View (`template.html`)**:
   * Chèn Widget bối cảnh Môi trường tại Tab 1 (Nội tâm) sử dụng các ID: `cog_active_location_label` (tên phòng), `cog_active_location_desc` (mô tả bối cảnh) và `cog_active_location_items` (kết xuất động danh sách vật phẩm).
3. **Frontend Controller (`index.js`)**:
   * `activeEnvironment`: Biến toàn cục lưu giữ trạng thái môi trường đang tải.
   * `getCharacterEnvironment(characterId)` & `saveCharacterEnvironment(characterId, envData)`: REST client helpers gọi endpoints backend.
   * `refreshEnvironmentUI()`: Biên dịch động danh sách vật phẩm, hiển thị số lượng (xN) và trạng thái trực quan với phong cách glassmorphism hiện đại.
   * `getMemoryPromptBlock(currentMessageIndex)`: Tiêm bối cảnh `environmentStr` vào system prompt.
   * `parseXmlTags(text)`: Quét và bóc tách các thẻ `<change_location>` và `<environment_update>`, làm sạch văn bản hiển thị trên khung thoại.
   * `renderParsedMessage()`: Xử lý kết quả bóc tách thẻ, tiến hành thay đổi biến môi trường toàn cục, gọi API lưu trữ và cập nhật UI.
   * `onChatChanged()` & `init()` Timeout: Reset và tải mới bối cảnh môi trường tương ứng khi đổi nhân vật/phòng chat.
   * `processAdminCommand(text)`: Tiêm bối cảnh môi trường vào Backstage Agent prompt, hướng dẫn AI Quản trị sử dụng các thẻ hành động bối cảnh, bóc tách và thực thi thay đổi bối cảnh.

---

### ⚠️ 2.3 Quy tắc Vàng Tuyệt Đối Không Được Phá Vỡ (The Golden Rules)

* **QUY TẮC 1: Không lạm dụng Số hóa thô bạo (No Over-mathematization)**:
  * Baseline Ticker ngầm 45s chỉ chạy toán học tuyến tính rất nhẹ để giữ cho các chỉ số Somatosensory không bị tĩnh lặng.
  * Tuyệt đối không dùng code JS để lập trình cứng các sự cố cực đoan (ngất lịm, tai nạn vệ sinh). Sự cố vật lý/sinh lý chỉ được diễn ra hữu cơ thông qua sự tự nhận thức của mô hình ngôn ngữ lớn (Character LLM) dựa trên bối cảnh thô `somaticStr` và `environmentStr` được tiêm vào system prompt.
* **QUY TẮC 2: Sandbox Browser Bypass**:
  * Trình duyệt Client-side chạy Javascript sandbox không thể ghi file trực tiếp lên ổ cứng máy chủ.
  * Bất kỳ thao tác đọc/ghi file môi trường nào đều bắt buộc phải gọi thông qua 2 endpoint Express Node.js đã được cấu hình tại `/api/extensions/environment/get` và `/api/extensions/environment/save`. Tuyệt đối không cố gắng sử dụng thư viện Node `fs` ở client-side `index.js`.
* **QUY TẮC 3: Tránh Phình Ngữ Cảnh (Context Compression)**:
  * Không bao giờ được phép tiêm toàn bộ thư viện các phòng của môi trường vật lý vào prompt.
  * Chỉ bốc đúng **Active Location** hiện tại, bao gồm mô tả căn phòng và danh sách vật phẩm tại căn phòng đó để làm prompt tiêm tối giản nhất.
* **QUY TẮC 4: Duy trì tính toàn vẹn của LTM Pruning**:
  * Hàm `consolidateMemoriesEngine(agent)` và logic Ebbinghaus E-STM phải được bảo vệ nguyên vẹn để dọn dẹp các ký ức dài hạn trùng lặp/say xỉn/vụn vặt.
* **QUY TẮC 5: Cưỡng Ép Định Dạng XML Bắt Buộc Ở Cuối Context (Last Message XML Injection)**:
  * Do các mô hình ngôn ngữ lớn (như GPT-4, Claude 3, Gemini) có xu hướng bắt chước rất nặng các mẫu hội thoại ví dụ (Example Dialogues) truyền thống của Character Card, chúng sẽ bỏ qua các chỉ thị XML nằm ở đầu context.
  * Vì vậy, bắt buộc phải tiêm (inject) cưỡng bức nhắc nhở định dạng XML trực tiếp vào **cuối tin nhắn User cuối cùng** (trong Chat Completion) và **cuối payload data.main** (trong Text Completion). Điều này đặt chỉ thị ngay trước lượt sinh câu trả lời của AI, đảm bảo mô hình tuyệt đối tuân thủ việc bọc suy nghĩ trong `<thought>` và lời thoại trong `<dialogue>`.

---

## 🚀 2.4 Hướng Phát Triển Tương Lai (Version 10.0)

Để chuẩn bị cho đợt nâng cấp tiếp theo, AI phiên sau có thể thảo luận cùng Hitsuji để phát triển các tính năng sau:
1. **Interactive UI Actions**: Bổ sung nút nhấn trực quan ngay trên Dashboard Tab 1 cho phép User kích hoạt thủ công việc di chuyển phòng hoặc chỉnh sửa trực tiếp trạng thái đồ vật thay vì chỉ dùng chat.
2. **Environmental Affects Physiology**: Nghiên cứu cơ chế tác động hữu cơ của môi trường lên sinh lý nhân vật (ví dụ: bối cảnh "Phòng khách lạnh lẽo" sẽ tự động làm giảm thân nhiệt nhẹ trong baseline ticker, bối cảnh "Bếp ăn" sẽ làm giảm tốc độ tích tụ đói/khát).
3. **Multi-Character Environment Sync**: Hỗ trợ đồng bộ hóa thế giới vật lý cố định này khi chat nhóm (Group Chat) trong SillyTavern để các nhân vật cùng chung sống trong một không gian nhất quán thực sự.

Chúc AI phiên sau tiếp quản dự án thuận lợi và tiếp tục mang lại những trải nghiệm đỉnh cao cho Hitsuji!
