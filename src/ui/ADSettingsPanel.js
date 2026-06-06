export class ADSettingsPanel {
    static async init() {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        // Safely check for either extension_settings or extensionSettings
        const ctxExtSettings = context.extension_settings || context.extensionSettings || {};
        if (!ctxExtSettings.anima_engine) {
            ctxExtSettings.anima_engine = {};
        }

        const settings = ctxExtSettings.anima_engine;
        
        // Defaults
        if (!settings.ad_api_key) settings.ad_api_key = '';
        if (!settings.ad_model) settings.ad_model = 'gemini-3.1-flash-lite';
        if (!settings.ad_api_url) settings.ad_api_url = 'https://api.shopaikey.com/v1/chat/completions';
        if (!settings.ad_daily_budget_usd) settings.ad_daily_budget_usd = 0.50;

        const updateStatus = () => {
            const statusEl = document.getElementById('anima_ad_status');
            if (statusEl) {
                statusEl.innerText = `AD Agent status: ${settings.ad_api_key ? 'configured' : 'not configured'}`;
            }
        };

        const saveSettings = () => {
            if (typeof SillyTavern.saveSettingsDebounced === 'function') {
                SillyTavern.saveSettingsDebounced();
            }
            updateStatus();
        };

        const attachEvent = (id, key) => {
            const el = document.getElementById(id);
            if (el) {
                // Initialize value from settings
                if (settings[key] !== undefined) {
                    el.value = settings[key];
                }
                
                el.addEventListener('input', () => {
                    let val = el.value;
                    if (el.type === 'number') val = parseFloat(val) || 0;
                    settings[key] = val;
                    saveSettings();
                });
            }
        };

        attachEvent('anima_ad_api_key', 'ad_api_key');
        attachEvent('anima_ad_model', 'ad_model');
        attachEvent('anima_ad_api_url', 'ad_api_url');
        attachEvent('anima_ad_daily_budget_usd', 'ad_daily_budget_usd');

        updateStatus();
    }
}
