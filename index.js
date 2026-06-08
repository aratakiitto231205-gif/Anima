// v0.11.1 — Hello Anima
// Scope A: verify ST + Anima wire đúng. Không LLM call, không feature.
// Pattern từ: city-unit/st-extension-example + Extension-Audio + silly-tavern-reminder

import { eventSource, event_types, saveSettingsDebounced } from "../../../../script.js";
import { extension_settings, getContext } from "../../../extensions.js";

const extensionName = "st-anima";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

const defaultSettings = {
    enabled: true,
    messageCount: 0,
};

async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    $("#anima_enabled").prop("checked", extension_settings[extensionName].enabled);
    $("#anima_message_count").text(extension_settings[extensionName].messageCount);
}

function appendLog(text) {
    const $ul = $("#anima-log");
    if ($ul.length === 0) return;
    $ul.append(`<li>${text}</li>`);
    // Cap log ở 20 dòng để tránh DOM nặng
    if ($ul.children().length > 20) {
        $ul.children().first().remove();
    }
}

function onMessageReceived(messageId) {
    if (!extension_settings[extensionName].enabled) return;
    const ctx = getContext();
    const msg = ctx?.chat?.[messageId];
    if (!msg) return;

    extension_settings[extensionName].messageCount++;
    saveSettingsDebounced();

    $("#anima_message_count").text(extension_settings[extensionName].messageCount);
    const role = msg.is_user ? "user" : "char";
    const preview = (msg.mes || "(empty)").slice(0, 40);
    appendLog(`#${messageId} ${role}: ${preview}`);
}

jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/panel.html`);
        $("#extensions_settings2").append(settingsHtml);

        // Init settings UI events
        $("#anima_enabled").on("input", (e) => {
            extension_settings[extensionName].enabled = Boolean($(e.target).prop("checked"));
            saveSettingsDebounced();
        });

        // Load + render settings
        loadSettings();

        // Listen ST events
        eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);

        appendLog("[anima] v0.11.1 loaded — wire OK");
        console.info("[st-anima] loaded, panel mounted to #extensions_settings2");
    } catch (err) {
        console.error("[st-anima] init failed:", err);
    }
});
