# Spec 001 — DX Foundation (ESLint Flat Config + Git Init)

**Status:** DRAFT — awaiting Hitsuji approval
**Author:** Claude (reviewer)
**Implementer:** Antigravity
**Date:** 2026-06-04
**Priority:** P0 (blocker for any new feature work)
**Estimate:** 15–30 min Antigravity work

---

## 🎯 Goal

Fix the broken ESLint config so `npm run lint` works, and initialize git so all future work has version control. Establish a clean baseline before any feature work.

## 📦 Scope (STRICT — do not expand)

### In scope
- ✅ Migrate `.eslintrc.json` → `eslint.config.js` (flat config, ESLint v9+ format)
- ✅ Migrate `.eslintignore` → `ignores` field in `eslint.config.js`
- ✅ `git init` + initial commit baseline
- ✅ Create `.gitignore`

### Out of scope (do NOT touch)
- ❌ Refactor existing code style
- ❌ Add new lint rules (only preserve old behavior)
- ❌ Modify any file in `src/`
- ❌ Modify `index.js` or any code logic
- ❌ Bump package versions (unless required by ESLint migration)

---

## ✅ Acceptance Criteria

1. `npm run lint` exits with code 0 (no error, no fatal warning)
2. Lint output is **functionally equivalent** to what the old `.eslintrc.json` would have produced
3. `git status` after initial commit shows clean working tree
4. `.gitignore` excludes: `node_modules/`, `coverage/`
5. Initial commit is signed off as `chore: initial baseline commit`
6. Both old config files (`.eslintrc.json`, `.eslintignore`) are deleted AFTER migration is verified working

## 📁 Files to create/modify

| Action | Path | Notes |
|---|---|---|
| **Create** | `eslint.config.js` | New flat config |
| **Delete** | `.eslintrc.json` | After `npm run lint` works |
| **Delete** | `.eslintignore` | After `npm run lint` works |
| **Create** | `.gitignore` | Standard Node + project-specific |
| **Run** | `git init` | One-time |
| **Run** | `git add . && git commit` | One-time, baseline |

## 🔧 Migration notes (hints for Antigravity)

**Old `.eslintrc.json` extends:**
- `eslint:recommended`
- `prettier`

**Old rules:**
- `no-unused-vars: warn`
- `no-undef: error`
- `eqeqeq: warn`
- `no-console: off`

**Old ignores:**
- `node_modules/`
- `archive/`
- `*.backup.*`
- `coverage/`

**Format constraint:** Project is `"type": "commonjs"` in `package.json` → `eslint.config.js` should use CommonJS syntax (`module.exports = ...` or `require()`). Do NOT use ESM (`import`).

**Suggested skeleton (verify and adapt):**
```js
const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

module.exports = [
    js.configs.recommended,
    prettier,
    {
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error',
            'eqeqeq': 'warn',
            'no-console': 'off',
        },
    },
    {
        ignores: [
            'node_modules/**',
            'archive/**',
            '**/*.backup.*',
            'coverage/**',
        ],
    },
];
```

⚠️ **Verify:** `eslint-config-prettier` may not work as a flat config spread. Antigravity should check ESLint v10 docs and adapt.

## 🧪 Test Cases

| ID | Action | Expected |
|---|---|---|
| TC-1 | Run `npm run lint` | Exit 0 |
| TC-2 | Run `npm run lint:fix` | Same files, no errors after auto-fix |
| TC-3 | Run `npm test` | Still 40/40 pass (regression check) |
| TC-4 | `git log --oneline` | 1 commit: "chore: initial baseline commit" |
| TC-5 | `git status` | Clean (no untracked, no modified) |
| TC-6 | `cat .gitignore` | Contains `node_modules/`, `coverage/` |
| TC-7 | `ls -la .eslintrc.json .eslintignore` | Both files don't exist |
| TC-8 | `ls eslint.config.js` | File exists |

## ⚠️ Risks

1. **Prettier config compatibility:** `eslint-config-prettier` v10+ may not work as a direct spread in flat config. May need to use different syntax or import a different helper.
2. **`CognitiveAgent.js.backup.old_v5`** in root: large old file, 178KB. Should we commit it? (My recommendation: YES — it's project history, fits `archive/` spirit. But can gitignore via `*.backup.*` if not.)
3. **`sessionStorage` state:** No actual files involved here, but if Antigravity ever runs the app, sessionStorage in browser may have runtime data. N/A for this task.
4. **Windows line endings:** Project is on Windows. Make sure `.gitattributes` is created with `* text=auto eol=lf` to avoid CRLF/LF issues in commits.

## ❓ Open questions (resolve before implementing)

1. **`CognitiveAgent.js.backup.old_v5`**: commit or gitignore?
   - **My recommendation:** Commit (project history)
2. **`archive/` folder**: commit or gitignore?
   - **My recommendation:** Commit (the old `v10.0.0-backup/` subfolder is part of project archaeology)
3. **Git author config**: should Antigravity use a specific name/email, or generic?
   - **Default suggestion:** `Anima Engine <anima@local>` if no preference
4. **Should `.gitattributes` be added for line ending normalization?**
   - **My recommendation:** YES, add `* text=auto eol=lf`

## 📋 Implementation order (suggested)

1. Create `eslint.config.js` (don't delete old files yet)
2. Run `npm run lint` — verify it works
3. If it works, delete `.eslintrc.json` and `.eslintignore`
4. Run `npm test` — verify no regression
5. Create `.gitignore`
6. Create `.gitattributes` (optional but recommended)
7. `git init` → `git add .` → review what's staged → `git commit`
8. Run all 8 test cases above
9. Reply in `agent_handoff/from_antigravity_002_done.md` with results

## 🚫 Stop conditions

Stop and ping Claude via `agent_handoff/from_claude_003.md` if:
- ESLint flat config requires changes not in scope
- You discover the old config had behavior you can't replicate 1:1
- Test count changes (regression)
- Git commit includes files you think shouldn't be tracked (e.g., credentials, large binaries)
