# From Antigravity → Claude (and Hitsuji)

**Date:** 2026-06-05
**Re:** Mobile Loader Fixes, dynamic SillyTavern context integration & git push completed

---

## 🛠️ Mobile Loader Bugs & Fixes

During the mobile test phase in Termux/phone browser, we encountered loading failures (crashes and silent failures). They have been resolved and pushed to `main`.

### 1. `manifest.json` Loader Crash
* **Bug:** The manifest had `"js": "index.js?v=10.0.0"` and `"css": "style.css?v=10.0.0"`. SillyTavern's server-side loader uses disk checks (e.g. `fs.existsSync`) which failed to match the query parameters to physical files, skipping the extension entirely.
* **Fix:** Reverted to standard filenames `"index.js"` and `"style.css"`.

### 2. Node.js `fs` & `path` imports in Browser Context
* **Bug:** `src/core/CognitiveAgent.js` had static imports of `fs` and `path` to load the character's `personality.json`. While this works in Node.js/Vitest, it threw a fatal module resolution crash in the browser, halting execution of `index.js` before any code (even try/catch wrappers) could run.
* **Fix:** 
  * Removed static `fs`/`path` imports.
  * In `getADIntentForMessage`, refactored to check the environment:
    * **Browser:** uses `fetch()` to load the personality file over HTTP dynamically: `/extensions/${moduleName}/characters/${characterName}/personality.json`.
    * **Node.js (Vitest):** dynamically imports `fs` and `path` via `await import(...)` to perform disk checks.
  * Keeps the module 100% browser-safe while maintaining full compatibility with Vitest unit tests.

### 3. Removed Static Imports of SillyTavern assets
* **Bug:** Relative paths (like `../../../../script.js`) assume a fixed folder structure. When installed from Git URL, the mounting directory structure/depth is variable (e.g. `/extensions/Anima/` vs `/scripts/extensions/third-party/Anima/`), causing browser-side 404s. Absolute paths (like `/script.js` and `/extensions.js` [which was a typo of `/scripts/extensions.js` anyway]) fail when SillyTavern is hosted on a subpath or blocked by CORS/CSP on mobile webviews.
* **Fix:** 
  * Replaced all static imports of `script.js` and `extensions.js` with calls to the browser-global `SillyTavern.getContext()` object.
  * All events, parameters, and template loading methods (like `eventSource`, `event_types`, `getRequestHeaders`, `renderExtensionTemplateAsync`, etc.) are resolved directly from this global context object.
  * Completely removes all file import dependency, making the extension loading extremely robust and folder-independent.

---

## 📊 Status Verification

* **Unit Tests:** `npm test` runs in `< 1s` with all **50/50 tests passed**.
* **Linter:** `npm run lint` checked, keeping only the 5 pre-existing warnings (no new warnings/errors).
* **Git:** Pushed to public repo: `https://github.com/aratakiitto231205-gif/Anima` (currently kept public for Termux install, ready to flip to private after mobile feel-test feedback).
* **Mobile Verification:** Hitsuji confirmed that the extension is now successfully installed, loaded, and running on the phone.

---

## 👥 Next Steps

1. **Mobile Feel-test (Hitsuji):** Chatting with Itto to test the AD Agent and neurochemical engines.
2. **Flip to Private:** Once mobile testing is stable, flip the repo to private.
3. **Spec 003 Prep (Claude):** Claude to review this handoff and start drafting Spec 003 based on Hitsuji's feedback.

— Antigravity
