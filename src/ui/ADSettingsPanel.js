export class ADSettingsPanel {
    static async init() {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        if (!context.extension_settings.anima_engine) {
            context.extension_settings.anima_engine = {};
        }

        const settings = context.extension_settings.anima_engine;
        
        // Defaults
        if (!settings.ad_api_key) settings.ad_api_key = '';
        if (!settings.ad_model) settings.ad_model = 'gemini-3.1-flash-lite';
        if (!settings.ad_api_url) settings.ad_api_url = 'https://api.shopaikey.com/v1/chat/completions';
        if (!settings.ad_daily_budget_usd) settings.ad_daily_budget_usd = 0.50;

        const html = `
            <div class="inline-drawer" id="anima_ad_settings">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Anima Engine: AD Agent Settings</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content" style="display: none;">
                    <div class="flex-container">
                        <label for="anima_ad_api_key">AD API Key:</label>
                        <input id="anima_ad_api_key" type="password" class="text_pole" value="${settings.ad_api_key}" placeholder="sk-...">
                    </div>
                    <div class="flex-container">
                        <label for="anima_ad_model">Model:</label>
                        <input id="anima_ad_model" type="text" class="text_pole" value="${settings.ad_model}">
                    </div>
                    <div class="flex-container">
                        <label for="anima_ad_api_url">API URL:</label>
                        <input id="anima_ad_api_url" type="text" class="text_pole" value="${settings.ad_api_url}">
                    </div>
                    <div class="flex-container">
                        <label for="anima_ad_daily_budget_usd">Daily Budget (USD):</label>
                        <input id="anima_ad_daily_budget_usd" type="number" step="0.01" class="text_pole" value="${settings.ad_daily_budget_usd}">
                    </div>
                    <div class="flex-container" style="margin-top: 10px;">
                        <span id="anima_ad_status" style="font-style: italic; opacity: 0.8;">
                            AD Agent status: ${settings.ad_api_key ? 'configured' : 'not configured'}
                        </span>
                    </div>
                </div>
            </div>
        `;

        const extSettings = document.getElementById('extensions_settings');
        if (extSettings) {
            extSettings.insertAdjacentHTML('beforeend', html);
        }

        const saveSettings = () => {
            if (typeof SillyTavern.saveSettingsDebounced === 'function') {
                SillyTavern.saveSettingsDebounced();
            }
            const statusEl = document.getElementById('anima_ad_status');
            if (statusEl) {
                statusEl.innerText = `AD Agent status: ${settings.ad_api_key ? 'configured' : 'not configured'}`;
            }
        };

        const attachEvent = (id, key) => {
            const el = document.getElementById(id);
            if (el) {
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
        
        // Add toggle behavior for drawer
        const drawer = document.getElementById('anima_ad_settings');
        if (drawer) {
            const header = drawer.querySelector('.inline-drawer-toggle');
            const content = drawer.querySelector('.inline-drawer-content');
            if (header && content) {
                header.addEventListener('click', () => {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? 'block' : 'none';
                });
            }
        }
    }
}
