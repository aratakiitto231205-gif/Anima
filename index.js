// v0.11.2 — Hello Anima
// Scope A: verify ST + Anima wire đúng.
// Pattern từ ST official docs (Writing-Extensions.md) + 4 ST extension GitHub tham khảo.
//
// Fix v0.11.2:
// - Dùng SillyTavern.getContext() destructure (work cho cả local + GitHub install)
// - Dùng renderExtensionTemplateAsync() thay vì $.get() (ST tự resolve path)
// - Dùng eventSource.on(event_types.APP_READY) thay vì jQuery boot (chính thức hơn)
// - Thêm error logging chi tiết để debug

const extensionName = 'st-anima';
const extensionFolder = `third-party/${extensionName}`;

const defaultSettings = {
    enabled: true,
    messageCount: 0,
};

async function loadSettings() {
    const { extension_settings } = SillyTavern.getContext();
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    $('#anima_enabled').prop('checked', extension_settings[extensionName].enabled);
    $('#anima_message_count').text(extension_settings[extensionName].messageCount);
}

function appendLog(text) {
    const $ul = $('#anima-log');
    if ($ul.length === 0) return;
    $ul.append(`<li>${text}</li>`);
    // Cap log ở 20 dòng để tránh DOM nặng
    if ($ul.children().length > 20) {
        $ul.children().first().remove();
    }
}

function onMessageReceived(messageId) {
    const ctx = SillyTavern.getContext();
    if (!ctx.extension_settings[extensionName].enabled) return;
    const msg = ctx.chat?.[messageId];
    if (!msg) return;

    ctx.extension_settings[extensionName].messageCount++;
    ctx.saveSettingsDebounced();

    $('#anima_message_count').text(ctx.extension_settings[extensionName].messageCount);
    const role = msg.is_user ? 'user' : 'char';
    const preview = (msg.mes || '(empty)').slice(0, 40);
    appendLog(`#${messageId} ${role}: ${preview}`);
}

jQuery(async () => {
    const { renderExtensionTemplateAsync, eventSource, event_types, saveSettingsDebounced } = SillyTavern.getContext();

    try {
        // Render panel từ template — ST tự resolve path, work cho cả local + GitHub install
        const settingsHtml = await renderExtensionTemplateAsync(extensionFolder, 'panel');
        $('#extensions_settings2').append(settingsHtml);

        // Init settings UI events
        $('#anima_enabled').on('input', (e) => {
            const ctx = SillyTavern.getContext();
            ctx.extension_settings[extensionName].enabled = Boolean($(e.target).prop('checked'));
            ctx.saveSettingsDebounced();
        });

        // Load + render settings
        await loadSettings();

        // Listen ST events
        eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);

        appendLog('[anima] v0.11.2 loaded — wire OK');
        console.info('[st-anima] v0.11.2 loaded, panel mounted to #extensions_settings2');
    } catch (err) {
        console.error('[st-anima] init failed:', err);
        console.error('[st-anima] stack:', err.stack);
    }
});
