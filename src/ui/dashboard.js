// v0.12.3 — Simplified Dashboard UI Manager
import { 
    logAnima, 
    registerAppendLogCallback, 
    clearAnimaLogs, 
    copyAnimaLogsToClipboard, 
    downloadAnimaLogsAsFile 
} from '../utils/logger.js';
import { ADAgent } from '../agents/ad.js';
import { AnimaState } from '../core/state.js';

export const AnimaUI = {
    MODULE_NAME: 'st-anima',
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

            this.setupButtons();
            
            // Register logger callback to append directly to UI log container
            registerAppendLogCallback((logEntry) => this.appendLog(logEntry));
            
            logAnima('success', 'UI', 'Dashboard UI initialized successfully');
        } catch (err) {
            logAnima('error', 'UI', `Render failed: ${err.message}`);
            console.error('[st-anima] mount error:', err);
        }
    },

    setupButtons() {
        // Log Actions
        document.getElementById('cog_btn_clear_logs')?.addEventListener('click', () => clearAnimaLogs());
        document.getElementById('cog_btn_copy_logs')?.addEventListener('click', () => copyAnimaLogsToClipboard());
        document.getElementById('cog_btn_download_logs')?.addEventListener('click', () => downloadAnimaLogsAsFile());

        // Backstage Chat Console
        const handleSend = () => {
            const inputEl = document.getElementById('cog_admin_chat_input');
            if (!inputEl) return;
            const command = inputEl.value.trim();
            if (!command) return;

            // Execute command on state via AD Agent
            const response = ADAgent.handleUserCommand(command, AnimaState);
            
            if (response.status === 'success') {
                logAnima('success', 'Terminal', response.message);
                if (typeof toastr !== 'undefined') toastr.success(response.message);
                this.updateUI(AnimaState);
                
                // Save settings/states
                if (typeof SillyTavern !== 'undefined') {
                    const charId = SillyTavern.getContext()?.characterId;
                    if (charId !== undefined) {
                        AnimaState.saveForCharacter(charId);
                    }
                }
            } else {
                logAnima('error', 'Terminal', response.message);
                if (typeof toastr !== 'undefined') toastr.error(response.message);
            }
            inputEl.value = '';
        };

        document.getElementById('cog_admin_send_btn')?.addEventListener('click', handleSend);
        document.getElementById('cog_admin_chat_input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    },

    renderPlaceholders(settings, defaultSettings) {
        const activeSettings = settings || defaultSettings;

        // Status
        const statusEl = document.getElementById('cog_dash_status');
        if (statusEl) {
            statusEl.innerText = activeSettings.enabled ? 'Active ✓' : 'Disabled';
            statusEl.style.color = activeSettings.enabled ? '#10b981' : '#94a3b8';
        }

        // Emotion
        const emoEl = document.getElementById('cog_dash_emotion');
        if (emoEl) emoEl.innerText = 'Neutral 😐';

        // Thoughts/Plan
        const thoughtsEl = document.getElementById('cog_dash_thoughts');
        if (thoughtsEl) thoughtsEl.innerHTML = '<i style="color: #64748b;">Chưa có kế hoạch kể chuyện nào...</i>';
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
        
        const tick = () => {
            if (valEl) valEl.innerText = new Date().toLocaleString('vi-VN');
        };
        tick();
        this.clockInterval = setInterval(tick, 1000);
        logAnima('success', 'UI', 'Live clock ticking started');
    },

    updateUI(state) {
        if (!state) return;

        // Status
        const statusEl = document.getElementById('cog_dash_status');
        if (statusEl) {
            statusEl.innerText = state.enabled ? 'Active ✓' : 'Disabled';
            statusEl.style.color = state.enabled ? '#10b981' : '#94a3b8';
        }

        // Emotion
        const emoEl = document.getElementById('cog_dash_emotion');
        if (emoEl) {
            emoEl.innerText = state.active_emotion || 'Neutral 😐';
        }

        // Thoughts/Plan
        const thoughtsEl = document.getElementById('cog_dash_thoughts');
        if (thoughtsEl) {
            if (state.activePlan && state.activePlan.segments) {
                const planLines = state.activePlan.segments.map((s, idx) => 
                    `[Seg ${idx + 1} - ${s.type}]: ${s.intent}`
                ).join('<br/>');
                thoughtsEl.innerHTML = `<strong>Appraisal:</strong> ${state.activePlan.appraisal || 'N/A'}<br/>${planLines}`;
            } else {
                thoughtsEl.innerHTML = '<i style="color: #64748b;">Chưa có kế hoạch kể chuyện nào...</i>';
            }
        }
    },

    appendLog(logEntry) {
        const container = document.getElementById('cog_logs_container');
        if (!container) return;

        // Remove placeholder text if present
        if (container.querySelector('i') && container.innerText.includes('Chưa có log')) {
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
