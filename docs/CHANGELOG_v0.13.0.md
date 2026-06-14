# Changelog v0.13.0 — LLM Integration for GM Agent

**Date:** 2026-06-14  
**Author:** Hitsuji + Claude

---

## 🎯 Mục tiêu bản này

Nối LLM vào GM Agent để tạo narrative plans thông minh hơn, thay vì rule-based keyword matching.

---

## ✨ Tính năng mới

### 1. **LLM Integration Module** (`src/utils/llm.js`)
- Tạo wrapper gọi ST's `generateRaw()` API
- Tự động fallback nếu LLM call fail
- Log đầy đủ (success/error)

### 2. **GM Agent nâng cấp** (`src/agents/gm.js`)
- Thay logic rule-based → LLM-powered
- Context builder: lấy 5 messages gần nhất + state hiện tại
- Prompt builder: yêu cầu LLM trả về JSON format
- Parser: extract JSON từ response, handle lỗi

### 3. **Model Selector cho GM** (Dashboard UI)
- **Reuse ST's model selector** (clone từ configuration gốc)
- Thêm option "(Dùng thiết lập ST)" ở đầu
- Lưu preference vào `extension_settings['st-anima'].gm_model`
- UI: Section mới trong panel.html ("Cấu hình GM Agent")

---

## 📝 Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/utils/llm.js` | **NEW** — LLM client wrapper |
| `src/agents/gm.js` | Rule-based → LLM-powered |
| `panel.html` | Thêm GM model selector section |
| `src/ui/dashboard.js` | `setupModelSelector()` — clone ST selector |
| `manifest.json` | v0.12.4 → v0.13.0 |
| `package.json` | v0.12.4 → v0.13.0 |

---

## 🧪 Testing Status

- **Unit tests:** Chưa update (vẫn pass với mock data cũ)
- **Integration test:** Cần test trên ST thật với LLM API

---

## 🚀 Next Steps

1. Test với ST environment thật
2. Verify LLM output quality
3. Update tests để cover LLM code path
4. Tune prompt nếu cần

---

## 📌 Notes

- LLM call **có fallback** → không crash nếu API fail
- Model selector **reuse ST logic** → không bị lỗi compatibility
- Prompt format yêu cầu JSON → dễ parse, ít lỗi
