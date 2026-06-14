# Hướng dẫn Test v0.13.0 — LLM-powered GM Agent

**Date:** 2026-06-14

---

## ⚙️ Prerequisites

1. **SillyTavern đã cài đặt** và chạy được
2. **API key đã setup** (OpenAI, Claude, hoặc bất kỳ provider nào ST hỗ trợ)
3. **Extension folder đúng vị trí:**
   ```
   SillyTavern/public/scripts/extensions/third-party/st-anima/
   ```

---

## 📦 Bước 1: Deploy extension

### Copy files vào ST:

```bash
# Từ project root
cp -r * /path/to/SillyTavern/public/scripts/extensions/third-party/st-anima/
```

Hoặc nếu đang dev:
```bash
# Symlink để dev nhanh hơn
ln -s "$(pwd)" /path/to/SillyTavern/public/scripts/extensions/third-party/st-anima
```

---

## 🚀 Bước 2: Khởi động ST và load extension

1. Start SillyTavern: `node server.js`
2. Mở browser → `http://localhost:8000`
3. Vào **Extensions** panel (icon puzzle piece)
4. Tìm **"Anima"** trong danh sách → Bật ON nếu chưa
5. Refresh page để load extension mới

---

## 🧪 Bước 3: Verify extension loaded

Mở **Browser DevTools** (F12) → **Console tab**

Tìm log:
```
[Anima Engine] Khởi chạy Anima Engine...
[SUCCESS] [Orchestrator] Đã khởi tạo Event Orchestrator.
[SUCCESS] [UI] Dashboard UI initialized successfully
```

Nếu thấy log này → Extension đã load ✅

---

## 🎛️ Bước 4: Cấu hình GM Model (Optional)

1. Scroll xuống panel **Anima Engine** trong Extensions
2. Tìm section **"Cấu hình GM Agent"**
3. Dropdown sẽ có:
   - `(Dùng thiết lập ST)` ← mặc định
   - Danh sách models từ ST configuration

**Recommendation:**
- Giữ `(Dùng thiết lập ST)` nếu muốn dùng API hiện tại
- Chọn model cụ thể nếu muốn test với model khác

---

## 💬 Bước 5: Test GM Agent với chat

1. **Load một character** (ví dụ: Itto, hoặc bất kỳ char nào)
2. **Gửi message test:**

```
Itto ơi, đi đấm nhau không? 👊
```

3. **Quan sát Dashboard UI:**
   - **"Kịch bản kể chuyện"** section sẽ update với GM output
   - **"Cảm xúc đích"** có thể thay đổi
   - **Logs** sẽ hiện:
     ```
     [INFO] [GM Agent] Đang lập kịch bản kể chuyện cho Itto...
     [SUCCESS] [LLM] Generated 245 chars
     [SUCCESS] [Orchestrator] Đã tiêm sạch Narrative Nudge vào prompt.
     ```

4. **Verify character response:**
   - Character phản hồi có phù hợp với context không?
   - Tone có match với emotion từ GM không?

---

## 🔍 Bước 6: Debug nếu có lỗi

### **Lỗi 1: "generateRaw function not available"**

**Nguyên nhân:** ST version quá cũ không có `generateRaw()` API

**Fix:** Update ST lên version mới hơn (1.11.0+)

---

### **Lỗi 2: "Empty response from LLM"**

**Nguyên nhân:** API key chưa setup hoặc API call fail

**Check:**
1. ST Settings → API settings → Verify API key
2. Test API connection trong ST trước
3. Check logs xem có error message từ provider không

---

### **Lỗi 3: "No JSON found in response"**

**Nguyên nhân:** LLM không trả về JSON format đúng

**Debug:**
1. Mở DevTools Console
2. Check log `[ERROR] [GM Agent] LLM call failed...`
3. Copy full response để xem LLM trả về gì
4. Có thể cần tune prompt trong `gm.js:buildPrompt()`

**Workaround:** Extension tự động fallback về default plan nếu parse fail

---

## ✅ Expected Behavior

**Khi mọi thứ hoạt động đúng:**

1. ✅ User gửi message → GM Agent được trigger
2. ✅ GM gọi LLM với context chat + state
3. ✅ LLM trả về JSON với emotion + plan
4. ✅ Dashboard UI update emotion & narrative plan
5. ✅ RP Agent inject nudge vào prompt
6. ✅ Character response có tone/context phù hợp

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Extension không load | Check path, refresh browser |
| Model selector trống | ST chưa config API, hoặc selector không clone được |
| LLM call timeout | Provider chậm, increase timeout hoặc dùng model nhẹ hơn |
| Character ignore nudge | Check nudge injection trong logs, có thể prompt quá dài |

---

## 📊 Test Checklist

- [ ] Extension loads without error
- [ ] Dashboard UI renders correctly
- [ ] Model selector shows ST models
- [ ] GM Agent triggers on new message
- [ ] LLM call succeeds (check logs)
- [ ] Dashboard updates with GM output
- [ ] Character response reflects GM plan
- [ ] Fallback works when LLM fails

---

## 💡 Tips

1. **Test với message ngắn trước** → dễ debug hơn
2. **Check logs trong cả DevTools VÀ Dashboard** → thông tin đầy đủ hơn
3. **Dùng Backstage Terminal** để test commands:
   ```
   status      → Xem state hiện tại
   set emotion Excited → Force emotion để test
   ```
4. **Nếu LLM response lạ** → copy prompt từ code, test trực tiếp với provider UI để tune

---

**Chúc test vui! 🎉**

Có lỗi gì báo lại để fix nhé!
