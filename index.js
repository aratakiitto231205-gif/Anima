// v0.12.2 — Clean Skeleton Bootstrapper
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { AnimaUI } from './src/ui/dashboard.js';
import { AnimaOrchestrator } from './src/core/orchestrator.js';
import { AnimaState } from './src/core/state.js';
import { logAnima } from './src/utils/logger.js';

let MODULE_NAME = 'st-anima';
const EXT_NAME = 'st-anima';

try {
    const extensionPath = new URL('.', import.meta.url).pathname;
    const extIdx = extensionPath.indexOf('/extensions/');
    if (extIdx !== -1) {
        MODULE_NAME = extensionPath.substring(extIdx + 12).replace(/\/$/, '');
    }
} catch (e) {
    console.error("Anima Engine: Failed to resolve MODULE_NAME dynamically, using default:", e);
}

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

async function init() {
    logAnima('info', 'System', 'Khởi chạy Anima Engine v0.12.2...');

    // 1. Khởi tạo cài đặt mặc định
    if (!extension_settings[EXT_NAME]) {
        extension_settings[EXT_NAME] = { ...defaultSettings };
    } else if (Object.keys(extension_settings[EXT_NAME]).length === 0) {
        Object.assign(extension_settings[EXT_NAME], defaultSettings);
    }
    saveSettingsDebounced();

    // 2. Mount Dashboard UI và vẽ placeholder
    await AnimaUI.mount(MODULE_NAME);
    AnimaUI.renderPlaceholders(extension_settings[EXT_NAME], defaultSettings);

    // 3. Khởi tạo Event Orchestrator
    AnimaOrchestrator.init({ eventSource, event_types });

    // 4. Nạp trạng thái nhân vật hiện tại nếu đã chọn
    setTimeout(() => {
        if (typeof SillyTavern !== 'undefined') {
            const context = SillyTavern.getContext();
            const charId = context?.characterId;
            if (charId !== undefined) {
                AnimaState.loadForCharacter(charId);
                AnimaUI.updateUI(AnimaState);
                
                const settings = extension_settings[EXT_NAME];
                AnimaUI.updateLiveClock(settings.feature_time !== false);
            }
        }
    }, 800);
}

jQuery(function () {
    init();
});
