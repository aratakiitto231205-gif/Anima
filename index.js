// v0.12.1 — Dashboard UI Shell (FIXED)
// Root cause v0.12.0: dùng SillyTavern global khi extension boot quá sớm
// (global chưa ready khi load từ GitHub). v10 work vì import trực tiếp
// từ script.js (ST expose module ngay từ đầu). Fix: dùng import tương đối
// cho eventSource, event_types, saveSettingsDebounced + dùng getContext()
// qua getContext function imported từ extensions.js.

import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { renderExtensionTemplateAsync, getContext, extension_settings } from '../../../extensions.js';

const MODULE_NAME = 'third-party/st-anima';
const EXT_NAME = 'st-anima';

const defaultSettings = {
    enabled: true,
    feature_time: true,
    feature_character: false,
    feature_mood: false,
    feature_memory: false,
    feature_hormone: false,
    feature_environment: false,
    feature_admin: false,
};

function logAnima(level, moduleName, message) {
    const colors = { info: '#94a3b8', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };
    const color = colors[level] || '#cbd5e1';
    console.log(`%c[Anima - ${level.toUpperCase()}]%c [${moduleName}] ${message}`, `color: ${color}; font-weight: bold;`, 'color: unset;');
}

// ==========================================
// TABS SWITCHING
// ==========================================
function setupTabs() {
    const tabBtns = document.querySelectorAll('.cog-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tabName = this.getAttribute('data-tab');
            document.querySelectorAll('.cog-tab-content').forEach(c => c.style.display = 'none');
            const target = document.getElementById(`cog_tab_${tabName}_content`);
            if (target) target.style.display = 'flex';
        });
    });
}

// ==========================================
// PLACEHOLDER RENDER — "—" / "Coming soon"
// ==========================================
function renderPlaceholders() {
    const ctx = getContext();
    const settings = ctx.extension_settings[EXT_NAME] || defaultSettings;

    // 1. Status box
    const statusEl = document.getElementById('cog_dash_status');
    if (statusEl) {
        statusEl.innerText = settings.enabled ? 'Active ✓' : 'Disabled';
        statusEl.style.color = settings.enabled ? '#10b981' : '#94a3b8';
    }

    // 2. Psychology
    const psychEl = document.getElementById('cog_dash_psych');
    if (psychEl) {
        psychEl.innerText = settings.feature_mood ? '—' : 'Coming soon';
        psychEl.style.color = settings.feature_mood ? '#10b981' : '#64748b';
    }

    // 3. Vitals
    ['cog_vital_heart_rate', 'cog_vital_blood_pressure', 'cog_vital_body_temp', 'cog_vital_resp_rate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = '—';
    });

    // 4. Somatosensory bars
    ['energy', 'pain', 'hunger', 'thirst', 'toilet_need', 'nausea'].forEach(k => {
        const valEl = document.getElementById(`cog_sens_${k}`);
        const barEl = document.getElementById(`cog_bar_${k}`);
        if (valEl) valEl.innerText = '—';
        if (barEl) barEl.style.width = '0%';
    });
    const tempSens = document.getElementById('cog_sens_temp');
    if (tempSens) tempSens.innerText = 'Coming soon';

    // 5. Hormones
    ['adrenaline', 'cortisol', 'melatonin', 'dopamine', 'serotonin', 'oxytocin', 'endorphins', 'sex_hormones'].forEach(k => {
        const valEl = document.getElementById(`cog_val_${k}`);
        const barEl = document.getElementById(`cog_bar_${k}`);
        if (valEl) valEl.innerText = '—';
        if (barEl) barEl.style.width = '0%';
    });

    // 6. Environment
    const locLabel = document.getElementById('cog_active_location_label');
    if (locLabel) locLabel.innerText = 'Coming soon';
    const locBadge = document.getElementById('cog_active_location_badge');
    if (locBadge) locBadge.style.display = 'none';
    const locDesc = document.getElementById('cog_active_location_desc');
    if (locDesc) locDesc.innerText = 'Môi trường sẽ được điền tự động khi feature ready.';
    const locItems = document.getElementById('cog_active_location_items');
    if (locItems) locItems.innerHTML = '<i style="color: #64748b; font-size: 0.85em;">—</i>';

    // 7. Emotion
    const emoEl = document.getElementById('cog_dash_emotion');
    if (emoEl) emoEl.innerHTML = '<span style="color: #64748b;">—</span>';

    // 8. Active recall / thoughts / tools
    const thoughtsEl = document.getElementById('cog_dash_thoughts');
    if (thoughtsEl) thoughtsEl.innerHTML = '<i style="color: #64748b;">—</i>';
    const recallEl = document.getElementById('cog_dash_active_recall');
    if (recallEl) recallEl.innerHTML = '<i style="color: #64748b;">—</i>';
    const toolsEl = document.getElementById('cog_dash_tools');
    if (toolsEl) toolsEl.innerHTML = '<i style="color: #64748b;">—</i>';

    // 9. Memory lists
    const lists = ['cog_db_triggers_list', 'cog_db_beliefs_list', 'cog_db_core_list', 'cog_db_drawer_list', 'cog_db_chronicles_list'];
    lists.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<i style="color: #64748b; font-size: 0.85em;">Coming soon</i>';
    });

    // 10. Chronicles
    const chroniclesEl = document.getElementById('cog_dash_idle_chronicles');
    if (chroniclesEl) chroniclesEl.innerHTML = '<i style="color: #64748b;">—</i>';

    // 11. Backstage
    const adminLog = document.getElementById('cog_admin_chat_log');
    if (adminLog) adminLog.innerHTML = '<i style="color: #64748b; font-size: 0.85em;">Coming soon</i>';

    // 12. Logs
    const logsEl = document.getElementById('cog_logs_container');
    if (logsEl) logsEl.innerHTML = '<i style="color: #64748b;">—</i>';
}

// ==========================================
// FEATURE: Live clock (verify wire)
// ==========================================
function renderLiveClock() {
    const ctx = getContext();
    const settings = ctx.extension_settings[EXT_NAME] || defaultSettings;
    if (!settings.feature_time) return;

    let clockEl = document.getElementById('anima_live_clock');
    if (!clockEl) {
        const statusTab = document.getElementById('cog_tab_status_content');
        if (!statusTab) return;
        clockEl = document.createElement('div');
        clockEl.id = 'anima_live_clock';
        clockEl.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 6px; padding: 8px 12px;';
        clockEl.innerHTML = '<span style="font-size: 0.85em; opacity: 0.85;">🕐 Thời gian thế giới (verify wire):</span><span id="anima_live_clock_value" style="font-weight: bold; color: #818cf8; font-family: monospace;">—</span>';
        statusTab.insertBefore(clockEl, statusTab.firstChild);
    }

    function tick() {
        const valEl = document.getElementById('anima_live_clock_value');
        if (valEl) valEl.innerText = new Date().toLocaleString('vi-VN');
    }
    tick();
    setInterval(tick, 1000);
    logAnima('success', 'Init', 'Live clock feature active');
}

// ==========================================
// INIT
// ==========================================
async function init() {
    logAnima('info', 'System', 'Khởi chạy Anima Engine v0.12.1 (Dashboard Shell + fixed imports)...');

    // Init settings defaults qua getContext() imported (an toàn)
    const ctx = getContext();
    ctx.extension_settings[EXT_NAME] = ctx.extension_settings[EXT_NAME] || {};
    if (Object.keys(ctx.extension_settings[EXT_NAME]).length === 0) {
        Object.assign(ctx.extension_settings[EXT_NAME], defaultSettings);
        saveSettingsDebounced();
    }

    // Render panel từ template
    const container = document.createElement('div');
    container.id = 'cognitive_dashboard_container';
    container.classList.add('extension_container');
    container.innerHTML = await renderExtensionTemplateAsync(MODULE_NAME, 'panel');

    // Mount panel
    const extSettings = document.getElementById('extensions_settings');
    if (extSettings) {
        extSettings.appendChild(container);
        logAnima('success', 'Init', 'Panel mounted to #extensions_settings');
    } else {
        const extSettings2 = document.getElementById('extensions_settings2');
        if (extSettings2) {
            extSettings2.appendChild(container);
            logAnima('warning', 'Init', 'Mounted to #extensions_settings2 (fallback)');
        } else {
            logAnima('error', 'Init', 'Cannot find #extensions_settings or #extensions_settings2');
        }
    }

    setupTabs();
    renderPlaceholders();
    renderLiveClock();

    logAnima('success', 'Init', 'v0.12.1 ready');
}

jQuery(function () {
    init();
});
