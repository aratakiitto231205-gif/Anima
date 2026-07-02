// v0.13.4 — Simplified Dashboard UI Manager
import { 
    logAnima, 
    registerAppendLogCallback, 
    clearAnimaLogs, 
    copyAnimaLogsToClipboard, 
    downloadAnimaLogsAsFile 
} from '../utils/logger.js';
import { ADAgent } from '../agents/ad.js';
import { AnimaState } from '../core/state.js';
import { extension_settings } from '../../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../../script.js';
import { translations } from '../utils/i18n.js';

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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
        this.renderApiStatus();

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

        // Language Selector
        document.getElementById('anima_language_select')?.addEventListener('change', (e) => {
            const settings = extension_settings[this.MODULE_NAME];
            if (settings) {
                settings.lang = e.target.value;
                saveSettingsDebounced();
                this.applyLanguage(settings.lang);
            }
        });

        // Toggle State Enable/Disable
        document.getElementById('anima_toggle_btn')?.addEventListener('click', () => {
            const settings = extension_settings[this.MODULE_NAME];
            const newState = !(settings.enabled !== false);
            
            settings.enabled = newState;
            saveSettingsDebounced();
            
            this.updateUI(AnimaState);

            const t = translations[settings.lang || 'en'] || translations.en;
            if (typeof toastr !== 'undefined') {
                toastr.success(`Anima Engine: ${newState ? t.engine_enabled : t.engine_disabled}`);
            }
            logAnima('info', 'UI', `${t.engine_toggled} ${newState ? t.engine_enabled : t.engine_disabled}`);
        });

        // API Config Selection
        const selectApiType = document.getElementById('anima_api_type');
        const customPanel = document.getElementById('anima_custom_api_panel');
        const stPanel = document.getElementById('anima_st_api_panel');

        const toggleApiPanel = () => {
            if (!selectApiType) return;
            const isCustom = selectApiType.value === 'custom';
            if (customPanel) customPanel.style.display = isCustom ? 'flex' : 'none';
            if (stPanel) stPanel.style.display = isCustom ? 'none' : 'flex';
            
            const settings = extension_settings[this.MODULE_NAME];
            if (settings) {
                settings.api_type = isCustom ? 'custom' : 'st_main';
                saveSettingsDebounced();
                AnimaUI.saveApiConfigToCharacter(settings);
            }
        };

        selectApiType?.addEventListener('change', toggleApiPanel);

        // Open ST Settings
        document.getElementById('anima_open_st_api_btn')?.addEventListener('click', () => {
            const stApiBtn = document.getElementById('api_button');
            if (stApiBtn) {
                stApiBtn.click();
            } else {
                logAnima('warn', 'UI', 'SillyTavern api_button not found.');
            }
        });

        // API Connection Profile UI Logic
        const connectBtn = document.getElementById('anima_custom_api_save_btn');
        const statusEl = document.getElementById('anima_custom_api_status');
        const availableModelsSelect = document.getElementById('anima_custom_api_available_models');
        const modelInput = document.getElementById('anima_custom_api_model');

        const updateApiStatus = (isValid, message) => {
            if (!statusEl) return;
            const dot = statusEl.querySelector('div');
            const text = statusEl.querySelector('span');
            const settings = extension_settings[this.MODULE_NAME] || {};
            const lang = settings.lang || 'en';
            const t = translations[lang] || translations.en;
            if (isValid) {
                dot.style.background = '#10b981';
                text.style.color = '#10b981';
                text.textContent = t.api_valid || 'Valid';
            } else {
                dot.style.background = '#ef4444';
                text.style.color = '#ef4444';
                text.textContent = message || t.api_invalid || 'Invalid';
            }
        };

        // Fetch Models and Validate Connection
        connectBtn?.addEventListener('click', async () => {
            saveSettingsDebounced();
            
            const urlInput = document.getElementById('anima_custom_api_url');
            const keyInput = document.getElementById('anima_custom_api_key');
            if (!urlInput || !keyInput) return;
            
            let baseUrl = urlInput.value.trim();
            if (!baseUrl) return;
            if (baseUrl.endsWith('/chat/completions')) {
                baseUrl = baseUrl.replace('/chat/completions', '');
            }
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

            try {
                const settings = extension_settings[this.MODULE_NAME] || {};
                const lang = settings.lang || 'en';
                const t = translations[lang] || translations.en;
                if (statusEl) statusEl.querySelector('span').textContent = t.api_connecting || 'Connecting...';
                
                const response = await fetch(`${baseUrl}/models`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${keyInput.value}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                if (data && data.data && Array.isArray(data.data)) {
                    updateApiStatus(true);
                    if (availableModelsSelect) {
                        availableModelsSelect.innerHTML = '';
                        const models = data.data.map(m => m.id).sort();
                        models.forEach(id => {
                            const opt = document.createElement('option');
                            opt.value = id;
                            opt.textContent = id;
                            availableModelsSelect.appendChild(opt);
                        });
                        // Set current model if present
                        if (modelInput && models.includes(modelInput.value)) {
                            availableModelsSelect.value = modelInput.value;
                        } else if (models.length > 0) {
                            availableModelsSelect.value = models[0];
                            if (modelInput) modelInput.value = models[0];
                             if (settings) {
                                 settings.custom_api_model = models[0];
                                 saveSettingsDebounced();
                                 AnimaUI.saveApiConfigToCharacter(settings);
                             }
                        }
                    }
                } else {
                    throw new Error('Invalid /models format');
                }
            } catch (err) {
                updateApiStatus(false, err.message);
                logAnima('error', 'UI', 'Connect API failed', err);
            }
        });

        // Dropdown selection to input
        availableModelsSelect?.addEventListener('change', (e) => {
            if (modelInput) {
                modelInput.value = e.target.value;
                const settings = extension_settings[this.MODULE_NAME];
                if (settings) {
                    settings.custom_api_model = e.target.value;
                    saveSettingsDebounced();
                    AnimaUI.saveApiConfigToCharacter(settings);
                }
            }
        });

        // Auto-save inputs while typing
        const autoSaveInput = (id, settingKey) => {
            document.getElementById(id)?.addEventListener('input', (e) => {
                const settings = extension_settings[this.MODULE_NAME];
                if (settings) {
                    settings[settingKey] = e.target.value;
                    saveSettingsDebounced();
                    AnimaUI.saveApiConfigToCharacter(settings);
                }
            });
        };
        autoSaveInput('anima_custom_api_url', 'custom_api_url');
        autoSaveInput('anima_custom_api_key', 'custom_api_key');
        autoSaveInput('anima_custom_api_model', 'custom_api_model');

        // Save Key Visual Feedback
        document.getElementById('anima_custom_api_key_btn')?.addEventListener('click', () => {
            saveSettingsDebounced();
            const settings = extension_settings[AnimaUI.MODULE_NAME];
            if (settings) {
                AnimaUI.saveApiConfigToCharacter(settings);
            }
            const keySavedMsg = document.getElementById('anima_custom_api_key_saved');
            if (keySavedMsg) {
                keySavedMsg.style.display = 'block';
                setTimeout(() => {
                    keySavedMsg.style.display = 'none';
                }, 3000);
            }
        });

        // Test Message Logic
        document.getElementById('anima_custom_api_test_btn')?.addEventListener('click', async () => {
            saveSettingsDebounced();
            const url = document.getElementById('anima_custom_api_url')?.value?.trim();
            const key = document.getElementById('anima_custom_api_key')?.value;
            const model = document.getElementById('anima_custom_api_model')?.value;
            
            if (!url) return;
            let targetUrl = url;
            if (!targetUrl.endsWith('/chat/completions')) {
                if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
                targetUrl = `${targetUrl}/chat/completions`;
            }
            
            try {
                const settings = extension_settings[this.MODULE_NAME] || {};
                const lang = settings.lang || 'en';
                const t = translations[lang] || translations.en;
                if (statusEl) statusEl.querySelector('span').textContent = t.api_testing || 'Testing...';
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model || 'gpt-3.5-turbo',
                        messages: [{role: 'user', content: 'Say "Hello from Anima GM!"'}],
                        max_tokens: 15
                    })
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                
                if (data.choices && data.choices[0]) {
                    updateApiStatus(true);
                    const successMsg = `${t.api_test_success || 'Test Success:'} ${data.choices[0].message.content}`;
                    logAnima('info', 'UI', successMsg);
                    window.alert(successMsg);
                } else {
                    throw new Error('Invalid chat response format');
                }
            } catch (err) {
                const settings = extension_settings[this.MODULE_NAME] || {};
                const lang = settings.lang || 'en';
                const t = translations[lang] || translations.en;
                updateApiStatus(false, err.message);
                const failedMsg = `${t.api_test_failed || 'Test Failed:'} ${err.message}`;
                window.alert(failedMsg);
                logAnima('error', 'UI', 'Test API failed', err);
            }
        });

        // Clear all extension data button
        document.getElementById('anima_clear_data_btn')?.addEventListener('click', async () => {
            const settings = extension_settings[this.MODULE_NAME] || {};
            const lang = settings.lang || 'en';
            const t = translations[lang] || translations.en;
            
            const confirmed = window.confirm(t.clear_data_confirm || 'Are you sure you want to delete all extension data? This will reset all settings, backups, and character config.');
            if (!confirmed) return;
            
            try {
                // 1. Clear character extension settings for ALL characters
                if (typeof SillyTavern !== 'undefined') {
                    const context = SillyTavern.getContext();
                    const characters = context.characters || [];
                    for (let i = 0; i < characters.length; i++) {
                        try {
                            context.writeExtensionField(i, 'st_anima_state', null);
                            context.writeExtensionField(i, 'st_anima_api_config', null);
                        } catch (err) {
                            console.error(`[st-anima] Failed to clear extensions for character index ${i}:`, err);
                        }
                    }
                }
                
                // 2. Clear localStorage backups
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('st_anima_backup_') || key.startsWith('anima_backup_'))) {
                        localStorage.removeItem(key);
                    }
                }
                
                // 3. Clear extension settings in memory
                extension_settings[this.MODULE_NAME] = {};
                saveSettingsDebounced();
                
                logAnima('success', 'UI', 'All extension data cleared successfully. Reloading SillyTavern...');
                if (typeof toastr !== 'undefined') {
                    toastr.success(t.clear_data_success || 'All extension data cleared successfully. Reloading page...');
                }
                
                // Reload page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (err) {
                logAnima('error', 'UI', `Failed to clear extension data: ${err.message}`);
                if (typeof toastr !== 'undefined') {
                    toastr.error(`Failed to clear data: ${err.message}`);
                }
            }
        });

        // End of Custom API Logic
    },

    async setupApiPanel() {
        // Backward-compatible: now just calls renderApiStatus
        return this.renderApiStatus();
    },

    async renderApiStatus() {
        const statusEl = document.getElementById('anima_api_status');
        if (!statusEl) return;

        if (typeof SillyTavern === 'undefined') {
            statusEl.innerHTML = '<i style="color: #f87171;">ST context chưa sẵn sàng</i>';
            return;
        }

        try {
            const context = SillyTavern.getContext();
            const mainApi = context.main_api || 'unknown';
            const chatSource = context.chat_completion_source || '';
            const model = context.model || '(chưa chọn)';
            const apiUrl = context.api_url || '';

            let html = '<div style="display: flex; flex-direction: column; gap: 4px;">';
            html += `<div><span style="color: #94a3b8;">API:</span> <span style="color: #34d399;">${mainApi}</span>${chatSource ? ` <span style="color: #64748b;">(${chatSource})</span>` : ''}</div>`;
            html += `<div><span style="color: #94a3b8;">Model:</span> <span style="color: #fbbf24;">${model}</span></div>`;
            if (apiUrl) html += `<div><span style="color: #94a3b8;">URL:</span> <span style="color: #cbd5e1; word-break: break-all;">${apiUrl}</span></div>`;
            html += '<div style="color: #64748b; font-size: 0.9em; margin-top: 2px;"><i>GM Agent dùng connection profile hiện tại của ST.</i></div>';
            html += '</div>';

            statusEl.innerHTML = html;
        } catch (err) {
            statusEl.innerHTML = `<i style="color: #f87171;">Lỗi đọc connection profile: ${err.message}</i>`;
        }
    },

    renderPlaceholders(settings, defaultSettings) {
        const activeSettings = settings || defaultSettings;
        const isEnabled = activeSettings.enabled !== false;

        // Restore language selector and apply translations
        const lang = activeSettings.lang || 'en';
        const selectLang = document.getElementById('anima_language_select');
        if (selectLang) selectLang.value = lang;
        this.applyLanguage(lang);

        // Restore API config inputs
        const apiType = activeSettings.api_type || 'st_main';
        const selectApiType = document.getElementById('anima_api_type');
        if (selectApiType) selectApiType.value = apiType;

        const customPanel = document.getElementById('anima_custom_api_panel');
        const stPanel = document.getElementById('anima_st_api_panel');
        if (customPanel) customPanel.style.display = apiType === 'custom' ? 'flex' : 'none';
        if (stPanel) stPanel.style.display = apiType === 'custom' ? 'none' : 'flex';

        const urlInput = document.getElementById('anima_custom_api_url');
        const keyInput = document.getElementById('anima_custom_api_key');
        const modelInput = document.getElementById('anima_custom_api_model');
        if (urlInput) urlInput.value = activeSettings.custom_api_url || '';
        if (keyInput) keyInput.value = activeSettings.custom_api_key || '';
        if (modelInput) modelInput.value = activeSettings.custom_api_model || '';

        // Status
        const statusEl = document.getElementById('cog_dash_status');
        if (statusEl) {
            const t = translations[lang] || translations.en;
            statusEl.innerText = isEnabled ? `${t.engine_enabled} ✓` : t.engine_disabled;
            statusEl.style.color = isEnabled ? '#10b981' : '#94a3b8';
        }

        // Emotion
        const emoEl = document.getElementById('cog_dash_emotion');
        if (emoEl) emoEl.innerText = 'Neutral 😐';
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
            const settings = extension_settings[this.MODULE_NAME] || {};
            const lang = settings.lang || 'en';
            let locale = 'en-US';
            if (lang === 'vi') locale = 'vi-VN';
            else if (lang === 'ja') locale = 'ja-JP';
            else if (lang === 'zh') locale = 'zh-CN';
            if (valEl) valEl.innerText = new Date().toLocaleString(locale);
        };
        tick();
        this.clockInterval = setInterval(tick, 1000);
        logAnima('success', 'UI', 'Live clock ticking started');
    },

    syncApiConfigFromCharacter(characterId) {
        if (typeof SillyTavern === 'undefined' || characterId === undefined) return;
        const context = SillyTavern.getContext();
        const character = context?.characters?.[characterId];
        const apiConfig = character?.data?.extensions?.st_anima_api_config;
        
        if (apiConfig) {
            const settings = extension_settings[this.MODULE_NAME];
            if (settings) {
                let changed = false;
                if (apiConfig.api_type !== undefined && settings.api_type !== apiConfig.api_type) {
                    settings.api_type = apiConfig.api_type;
                    changed = true;
                }
                if (apiConfig.custom_api_url !== undefined && settings.custom_api_url !== apiConfig.custom_api_url) {
                    settings.custom_api_url = apiConfig.custom_api_url;
                    changed = true;
                }
                if (apiConfig.custom_api_key !== undefined && settings.custom_api_key !== apiConfig.custom_api_key) {
                    settings.custom_api_key = apiConfig.custom_api_key;
                    changed = true;
                }
                if (apiConfig.custom_api_model !== undefined && settings.custom_api_model !== apiConfig.custom_api_model) {
                    settings.custom_api_model = apiConfig.custom_api_model;
                    changed = true;
                }
                if (changed) {
                    saveSettingsDebounced();
                    const t = translations[settings.lang || 'en'] || translations.en;
                    logAnima('info', 'UI', t.restored_profile || 'Restored API Profile from character.');
                }
            }
        }
    },

    saveApiConfigToCharacter(settings) {
        if (typeof SillyTavern === 'undefined' || !settings) return;
        const context = SillyTavern.getContext();
        const charId = context?.characterId;
        if (charId === undefined) return;
        
        const apiConfig = {
            api_type: settings.api_type,
            custom_api_url: settings.custom_api_url,
            custom_api_key: settings.custom_api_key,
            custom_api_model: settings.custom_api_model
        };
        try {
            context.writeExtensionField(charId, 'st_anima_api_config', apiConfig);
            const t = translations[settings.lang || 'en'] || translations.en;
            logAnima('success', 'UI', t.saved_profile || 'Saved API config to character.');
        } catch (e) {
            logAnima('error', 'UI', `Failed to save API config to character: ${e.message}`);
        }
    },

    applyLanguage(lang) {
        const t = translations[lang] || translations.en;
        
        // Element translation mappings
        const textElements = {
            'anima_label_clock': t.clock_label,
            'anima_label_toggle_header': t.toggle_header,
            'anima_label_emotion_header': t.emotion_header,
            'anima_label_plan_header': t.plan_header,
            'anima_label_logs_header': t.logs_header,
            'anima_label_api_profile_header': t.api_profile_header,
            'anima_label_st_api_desc': t.st_api_desc,
            'anima_label_open_st_api_btn': t.open_st_api_btn,
            'anima_label_custom_source': t.custom_source,
            'anima_label_custom_endpoint': t.custom_endpoint,
            'anima_label_custom_key': t.custom_key,
            'anima_label_key_saved_text': t.custom_key_saved,
            'anima_label_custom_model_id': t.custom_model_id,
            'anima_label_custom_available_models': t.custom_available_models,
            'anima_label_connect_btn': t.connect_btn,
            'anima_label_test_btn': t.test_btn,
            'anima_label_backstage_header': t.backstage_header,
            'anima_label_backstage_send': t.backstage_send,
            'anima_label_danger_zone': t.danger_zone,
            'anima_label_clear_data_btn': t.clear_data_btn
        };

        for (const [id, value] of Object.entries(textElements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        // Translate API profile dropdown option elements
        const selectApiType = document.getElementById('anima_api_type');
        if (selectApiType) {
            const optSt = selectApiType.querySelector('option[value="st_main"]');
            if (optSt) optSt.textContent = t.api_type_st || 'SillyTavern Default';
            const optCustom = selectApiType.querySelector('option[value="custom"]');
            if (optCustom) optCustom.textContent = t.api_type_custom || 'Custom (OpenAI Format)';
        }

        // Translate Custom API source dropdown option elements
        const selectCustomSource = document.getElementById('anima_custom_api_source');
        if (selectCustomSource) {
            const optCustomSource = selectCustomSource.querySelector('option[value="custom"]');
            if (optCustomSource) optCustomSource.textContent = t.api_source_custom || 'Custom (OpenAI-compatible)';
        }

        // Translate Custom Endpoint description small HTML element
        const endpointDesc = document.getElementById('anima_label_custom_endpoint_desc');
        if (endpointDesc) {
            endpointDesc.innerHTML = t.custom_endpoint_desc;
        }

        // Translate empty available model placeholder in Custom API available models dropdown
        const selectAvailableModels = document.getElementById('anima_custom_api_available_models');
        if (selectAvailableModels) {
            const firstOpt = selectAvailableModels.querySelector('option[value=""]');
            if (firstOpt) firstOpt.textContent = t.custom_load_models_placeholder || 'Load models to view...';
        }

        // Placeholders and titles
        const inputEl = document.getElementById('cog_admin_chat_input');
        if (inputEl) inputEl.placeholder = t.backstage_placeholder;

        const copyLogsBtn = document.getElementById('cog_btn_copy_logs');
        if (copyLogsBtn) copyLogsBtn.title = t.title_copy_logs || 'Copy logs';

        const downloadLogsBtn = document.getElementById('cog_btn_download_logs');
        if (downloadLogsBtn) downloadLogsBtn.title = t.title_download_logs || 'Download logs';

        const clearLogsBtn = document.getElementById('cog_btn_clear_logs');
        if (clearLogsBtn) clearLogsBtn.title = t.title_clear_logs || 'Clear logs';
        
        // Also update placeholders if plan/thoughts are empty
        const thoughtsEl = document.getElementById('cog_dash_thoughts');
        if (thoughtsEl && (!AnimaState.activePlan || !AnimaState.activePlan.segments)) {
            thoughtsEl.innerHTML = `<i style="color: #64748b;">${escapeHTML(t.plan_empty)}</i>`;
        }
        
        const logsContainer = document.getElementById('cog_logs_container');
        if (logsContainer && logsContainer.querySelector('i')) {
            logsContainer.innerHTML = `<i style="color: #64748b; font-size: 0.82em;">${escapeHTML(t.logs_empty)}</i>`;
        }
    },

    updateUI(state) {
        if (!state) return;

        // Status
        const statusEl = document.getElementById('cog_dash_status');
        if (statusEl) {
            const isEnabled = extension_settings[this.MODULE_NAME]?.enabled !== false;
            const lang = extension_settings[this.MODULE_NAME]?.lang || 'en';
            const t = translations[lang] || translations.en;
            statusEl.innerText = isEnabled ? `${t.engine_enabled} ✓` : t.engine_disabled;
            statusEl.style.color = isEnabled ? '#10b981' : '#94a3b8';
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
                    `[Seg ${idx + 1} - ${escapeHTML(s.type)}]: ${escapeHTML(s.intent)}`
                ).join('<br/>');
                thoughtsEl.innerHTML = `<strong>Appraisal:</strong> ${escapeHTML(state.activePlan.appraisal || 'N/A')}<br/>${planLines}`;
            } else {
                const lang = extension_settings[this.MODULE_NAME]?.lang || 'en';
                const t = translations[lang] || translations.en;
                thoughtsEl.innerHTML = `<i style="color: #64748b;">${escapeHTML(t.plan_empty)}</i>`;
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

        logDiv.innerHTML = `<span style="color: #64748b;">[${logEntry.time}]</span> <span style="color: ${color}; font-weight: bold;">[${logEntry.level}]</span> <span style="color: #818cf8;">[${logEntry.module}]</span> <span style="color: #e2e8f0;">${escapeHTML(logEntry.message)}</span>`;
        
        container.appendChild(logDiv);
        container.scrollTop = container.scrollHeight;
        
        // Cap lines at 100 inside container
        while (container.childNodes.length > 100) {
            container.removeChild(container.firstChild);
        }
    }
};
