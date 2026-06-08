// v0.12.2 — Dashboard UI Manager
import { 
    logAnima, 
    registerAppendLogCallback, 
    clearAnimaLogs, 
    copyAnimaLogsToClipboard, 
    downloadAnimaLogsAsFile 
} from '../utils/logger.js';

export const AnimaUI = {
    MODULE_NAME: 'st-anima',
    EXT_NAME: 'st-anima',
    clockInterval: null,

    async mount(MODULE_NAME) {
        this.MODULE_NAME = MODULE_NAME;
        if (typeof SillyTavern === 'undefined') return;
        
        const context = SillyTavern.getContext();
        const { renderExtensionTemplateAsync } = context;

        try {
            const container = document.createElement('div');
            container.id = 'cognitive_dashboard_container';
            container.classList.add('extension_container');
            container.innerHTML = await renderExtensionTemplateAsync(this.MODULE_NAME, 'panel');

            // Mount panel to extensions settings drawer
            const extSettings = document.getElementById('extensions_settings');
            if (extSettings) {
                extSettings.appendChild(container);
                logAnima('success', 'UI', `Panel mounted to #extensions_settings`);
            } else {
                const extSettings2 = document.getElementById('extensions_settings2');
                if (extSettings2) {
                    extSettings2.appendChild(container);
                    logAnima('warning', 'UI', 'Mounted to #extensions_settings2 (fallback)');
                } else {
                    logAnima('error', 'UI', 'Cannot find mount target');
                    return;
                }
            }

            this.setupTabs();
            this.setupButtons();
            
            // Register logger callback to append directly to UI log container
            registerAppendLogCallback((logEntry) => this.appendLog(logEntry));
            
            logAnima('success', 'UI', 'Dashboard UI initialized successfully');
        } catch (err) {
            logAnima('error', 'UI', `Render failed: ${err.message}`);
            console.error('[st-anima] mount error:', err);
        }
    },

    setupTabs() {
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
    },

    setupButtons() {
        // Log Actions
        document.getElementById('cog_btn_clear_logs')?.addEventListener('click', () => clearAnimaLogs());
        document.getElementById('cog_btn_copy_logs')?.addEventListener('click', () => copyAnimaLogsToClipboard());
        document.getElementById('cog_btn_download_logs')?.addEventListener('click', () => downloadAnimaLogsAsFile());
    },

    renderPlaceholders(settings, defaultSettings) {
        const activeSettings = settings || defaultSettings;

        // Status
        const statusEl = document.getElementById('cog_dash_status');
        if (statusEl) {
            statusEl.innerText = activeSettings.enabled ? 'Active ✓' : 'Disabled';
            statusEl.style.color = activeSettings.enabled ? '#10b981' : '#94a3b8';
        }

        // Psychological state
        const psychEl = document.getElementById('cog_dash_psych');
        if (psychEl) {
            psychEl.innerText = activeSettings.feature_mood ? '—' : 'Coming soon';
            psychEl.style.color = activeSettings.feature_mood ? '#10b981' : '#64748b';
        }

        // Vitals
        ['cog_vital_heart_rate', 'cog_vital_blood_pressure', 'cog_vital_body_temp', 'cog_vital_resp_rate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = '—';
        });

        // Somatosensory
        ['energy', 'pain', 'hunger', 'thirst', 'toilet_need', 'nausea'].forEach(k => {
            const valEl = document.getElementById(`cog_sens_${k}`);
            const barEl = document.getElementById(`cog_bar_${k}`);
            if (valEl) valEl.innerText = '—';
            if (barEl) barEl.style.width = '0%';
        });
        const tempSens = document.getElementById('cog_sens_temp');
        if (tempSens) tempSens.innerText = 'Coming soon';

        // Hormones
        ['adrenaline', 'cortisol', 'melatonin', 'dopamine', 'serotonin', 'oxytocin', 'endorphins', 'sex_hormones'].forEach(k => {
            const valEl = document.getElementById(`cog_val_${k}`);
            const barEl = document.getElementById(`cog_bar_${k}`);
            if (valEl) valEl.innerText = '—';
            if (barEl) barEl.style.width = '0%';
        });

        // Environment
        const locLabel = document.getElementById('cog_active_location_label');
        if (locLabel) locLabel.innerText = 'Coming soon';
        const locBadge = document.getElementById('cog_active_location_badge');
        if (locBadge) locBadge.style.display = 'none';
        const locDesc = document.getElementById('cog_active_location_desc');
        if (locDesc) locDesc.innerText = 'Môi trường sẽ được điền tự động khi feature ready.';
        const locItems = document.getElementById('cog_active_location_items');
        if (locItems) locItems.innerHTML = '<i style="color: #64748b; font-size: 0.85em;">—</i>';

        // Emotion
        const emoEl = document.getElementById('cog_dash_emotion');
        if (emoEl) emoEl.innerHTML = '<span style="color: #64748b;">—</span>';

        // Thoughts/recall/tools
        const thoughtsEl = document.getElementById('cog_dash_thoughts');
        if (thoughtsEl) thoughtsEl.innerHTML = '<i style="color: #64748b;">—</i>';
        const recallEl = document.getElementById('cog_dash_active_recall');
        if (recallEl) recallEl.innerHTML = '<i style="color: #64748b;">—</i>';
        const toolsEl = document.getElementById('cog_dash_tools');
        if (toolsEl) toolsEl.innerHTML = '<i style="color: #64748b;">—</i>';

        // Memory lists
        const lists = ['cog_db_triggers_list', 'cog_db_beliefs_list', 'cog_db_core_list', 'cog_db_drawer_list', 'cog_db_chronicles_list'];
        lists.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<i style="color: #64748b; font-size: 0.85em;">Coming soon</i>';
        });

        // Chronicles
        const chroniclesEl = document.getElementById('cog_dash_idle_chronicles');
        if (chroniclesEl) chroniclesEl.innerHTML = '<i style="color: #64748b;">—</i>';

        // Backstage
        const adminLog = document.getElementById('cog_admin_chat_log');
        if (adminLog) adminLog.innerHTML = '<i style="color: #64748b; font-size: 0.85em;">Coming soon</i>';
    },

    updateLiveClock(featureTimeEnabled) {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        const clockContainer = document.getElementById('anima_live_clock');
        if (!clockContainer) return;

        if (!featureTimeEnabled) {
            clockContainer.style.display = 'none';
            return;
        }

        clockContainer.style.display = 'flex';
        const valEl = document.getElementById('anima_live_clock_value');
        
        function tick() {
            if (valEl) valEl.innerText = new Date().toLocaleString('vi-VN');
        }
        tick();
        this.clockInterval = setInterval(tick, 1000);
        logAnima('success', 'UI', 'Live clock ticking started');
    },

    updateUI(state) {
        if (!state) return;

        // Vitals
        const hrEl = document.getElementById('cog_vital_heart_rate');
        if (hrEl) hrEl.innerText = `${state.vitals.heart_rate} bpm`;
        
        const bpEl = document.getElementById('cog_vital_blood_pressure');
        if (bpEl) bpEl.innerText = `${state.vitals.blood_pressure_sys}/${state.vitals.blood_pressure_dia}`;
        
        const tempEl = document.getElementById('cog_vital_body_temp');
        if (tempEl) tempEl.innerText = `${state.vitals.body_temp.toFixed(1)}°C`;
        
        const respEl = document.getElementById('cog_vital_resp_rate');
        if (respEl) respEl.innerText = `${state.vitals.resp_rate}/m`;

        // Somatosensory
        Object.keys(state.body_status).forEach(k => {
            if (k === 'temp_sensation') {
                const tsEl = document.getElementById('cog_sens_temp');
                if (tsEl) tsEl.innerText = state.body_status.temp_sensation;
                return;
            }
            const valEl = document.getElementById(`cog_sens_${k}`);
            const barEl = document.getElementById(`cog_bar_${k}`);
            const val = state.body_status[k];
            if (valEl) valEl.innerText = typeof val === 'number' ? val.toFixed(1) : val;
            if (barEl) barEl.style.width = `${Math.min(val * 10, 100)}%`;
        });

        // Hormones
        Object.keys(state.hormones).forEach(k => {
            const valEl = document.getElementById(`cog_val_${k}`);
            const barEl = document.getElementById(`cog_bar_${k}`);
            const val = state.hormones[k];
            if (valEl) valEl.innerText = val.toFixed(1);
            if (barEl) barEl.style.width = `${Math.min(val * 10, 100)}%`;
        });

        // Mental state / Emotion
        const psychEl = document.getElementById('cog_dash_psych');
        if (psychEl) psychEl.innerText = state.mental_state;

        const emoEl = document.getElementById('cog_dash_emotion');
        if (emoEl) emoEl.innerText = state.active_emotion || 'Neutral 😐';

        // Thoughts/Recall
        const thoughtsEl = document.getElementById('cog_dash_thoughts');
        if (thoughtsEl) thoughtsEl.innerText = state.activePlan?.appraisal || 'Chưa có suy nghĩ nội tâm nào...';

        const recallEl = document.getElementById('cog_dash_active_recall');
        if (recallEl) {
            if (state.recalled_memories && state.recalled_memories.length > 0) {
                recallEl.innerHTML = state.recalled_memories.map(m => `<div>• ${m}</div>`).join('');
            } else {
                recallEl.innerHTML = '<i style="color: #64748b;">Đầu óc trống rỗng, không liên tưởng gì...</i>';
            }
        }
    },

    appendLog(logEntry) {
        const container = document.getElementById('cog_logs_container');
        if (!container) return;

        // Remove placeholder text if present
        if (container.querySelector('i') && container.innerText.includes('—')) {
            container.innerHTML = '';
        }

        const logDiv = document.createElement('div');
        logDiv.className = `cog-log-line cog-log-${logEntry.level.toLowerCase()}`;
        logDiv.style.cssText = 'font-size: 0.82em; border-bottom: 1px solid rgba(255,255,255,0.03); padding: 4px 0; font-family: monospace; line-height: 1.35;';
        
        let color = '#cbd5e1';
        if (logEntry.level === 'SUCCESS') color = '#34d399';
        else if (logEntry.level === 'WARNING') color = '#fbbf24';
        else if (logEntry.level === 'ERROR') color = '#f87171';
        else if (logEntry.level === 'COGNITIVE') color = '#c084fc';
        else if (logEntry.level === 'INFO') color = '#94a3b8';

        logDiv.innerHTML = `<span style="color: #64748b;">[${logEntry.time}]</span> <span style="color: ${color}; font-weight: bold;">[${logEntry.level}]</span> <span style="color: #818cf8;">[${logEntry.module}]</span> <span style="color: #e2e8f0;">${logEntry.message}</span>`;
        
        container.appendChild(logDiv);
        container.scrollTop = container.scrollHeight;
        
        // Cap lines at 100 inside container
        while (container.childNodes.length > 100) {
            container.removeChild(container.firstChild);
        }
    }
};
