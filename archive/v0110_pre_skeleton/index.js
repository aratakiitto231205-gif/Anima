// v0.11.0
import { ADSettingsPanel } from './src/ui/ADSettingsPanel.js';
import { EventOrchestrator } from './src/orchestration/EventOrchestrator.js';
import { getActiveAgent, saveActiveAgentState, resetActiveAgent } from './src/utils/agentStore.js';
import { logAnima, clearAnimaLogs, copyAnimaLogsToClipboard, downloadAnimaLogsAsFile, refreshLogsUi } from './src/utils/logger.js';
import { refreshMemoryUI } from './src/ui/DashboardUI.js';
import { startChatObserver } from './src/ui/DOMAutoHealing.js';
import { handleAdminMessage } from './src/backstage/BackstageConsole.js';
import { startSubconsciousTicker } from './src/backstage/SubconsciousTicker.js';
import { executeTimeJump } from './src/services/TimeJumpService.js';
import { TIMING } from './src/utils/constants.js';

let orchestrator = null;
let MODULE_NAME = 'third-party/Anima';

try {
    const extensionPath = new URL('.', import.meta.url).pathname;
    const extIdx = extensionPath.indexOf('/extensions/');
    if (extIdx !== -1) {
        MODULE_NAME = extensionPath.substring(extIdx + 12).replace(/\/$/, '');
    }
} catch (e) {
    console.error("Anima Engine: Failed to resolve MODULE_NAME dynamically, using default 'third-party/Anima':", e);
}

function refreshMemoryUIWrapper() {
    const env = orchestrator ? orchestrator.activeEnvironment : null;
    refreshMemoryUI(getActiveAgent(), env, saveActiveAgentState);
}

// Bug 4: return the promise so ST can await the prompt injection
globalThis.animaCognitiveInterceptor = async function(chat) {
    if (orchestrator) {
        return orchestrator.onPromptInterceptor(chat);
    }
};

function setupTabs() {
    const tabBtns = document.querySelectorAll('.cog-tab-btn');
    tabBtns.forEach((btn) => {
        btn.addEventListener('click', function () {
            tabBtns.forEach((b) => b.classList.remove('active'));
            this.classList.add('active');

            const tabName = this.getAttribute('data-tab');
            document.querySelectorAll('.cog-tab-content').forEach((c) => (c.style.display = 'none'));

            const targetContent = document.getElementById(`cog_tab_${tabName}_content`);
            if (targetContent) {
                targetContent.style.display = 'flex';
            }
        });
    });

    const awareToggle = document.getElementById('cog_opt_self_aware');
    if (awareToggle) {
        const agent = getActiveAgent();
        if (agent) {
            awareToggle.checked = agent.consciousness.self_awareness;
        }
        awareToggle.addEventListener('change', function () {
            const agent = getActiveAgent();
            if (agent) {
                agent.consciousness.self_awareness = this.checked;
                saveActiveAgentState();
                logAnima('cognitive', 'System', `Đã cập nhật toggle Nhận thức ảo ảnh: ${this.checked}`);
            }
        });
    }

    const bgConToggle = document.getElementById('cog_opt_bg_conscious');
    if (bgConToggle) {
        const agent = getActiveAgent();
        if (agent) {
            bgConToggle.checked = agent.consciousness.bg_consciousness;
        }
        bgConToggle.addEventListener('change', function () {
            const agent = getActiveAgent();
            if (agent) {
                agent.consciousness.bg_consciousness = this.checked;
                saveActiveAgentState();
                const subBox = document.getElementById('cog_subconscious_box');
                if (subBox) subBox.style.display = this.checked ? 'block' : 'none';
                logAnima('cognitive', 'System', `Đã cập nhật toggle Ý thức chạy ngầm: ${this.checked}`);
            }
        });
    }

    const splitToggle = document.getElementById('cog_opt_split_physiological');
    if (splitToggle) {
        const agent = getActiveAgent();
        if (agent) {
            splitToggle.checked = agent.consciousness.split_physiological;
        }
        splitToggle.addEventListener('change', function () {
            const agent = getActiveAgent();
            if (agent) {
                agent.consciousness.split_physiological = this.checked;
                saveActiveAgentState();
                logAnima('cognitive', 'System', `Đã cập nhật toggle Phản hồi Sinh lý Phân tách: ${this.checked}`);
            }
        });
    }
}

function setupEventHandlers() {
    const adminSendBtn = document.getElementById('cog_admin_send_btn');
    if (adminSendBtn) {
        adminSendBtn.addEventListener('click', () => {
            const env = orchestrator ? orchestrator.activeEnvironment : null;
            handleAdminMessage(getActiveAgent(), env, { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper });
        });
    }
    const adminInputEl = document.getElementById('cog_admin_chat_input');
    if (adminInputEl) {
        adminInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const env = orchestrator ? orchestrator.activeEnvironment : null;
                handleAdminMessage(getActiveAgent(), env, { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper });
            }
        });
    }

    document.querySelectorAll('.cog-time-jump-btn').forEach((btn) => {
        btn.addEventListener('click', function () {
            const mins = parseInt(this.getAttribute('data-minutes'));
            if (!isNaN(mins)) executeTimeJump(mins, getActiveAgent(), { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper });
        });
    });

    const customTimeBtn = document.getElementById('cog_custom_time_jump_btn');
    if (customTimeBtn) {
        customTimeBtn.addEventListener('click', () => {
            const input = document.getElementById('cog_custom_time_jump');
            if (input) {
                const mins = parseInt(input.value);
                if (!isNaN(mins) && mins > 0) {
                    executeTimeJump(mins, getActiveAgent(), { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper });
                    input.value = '';
                }
            }
        });
    }

    const saveBodyBtn = document.getElementById('cog_save_body');
    if (saveBodyBtn) {
        saveBodyBtn.addEventListener('click', () => {
            const textEl = document.getElementById('cog_db_body');
            const agent = getActiveAgent();
            if (textEl && agent) {
                agent.body = textEl.value.trim();
                saveActiveAgentState();
                toastr.success('Đã cập nhật trạng thái cơ thể thành công!');
                refreshMemoryUIWrapper();
            }
        });
    }

    const clearMemBtn = document.getElementById('cog_clear_memory');
    if (clearMemBtn) {
        clearMemBtn.addEventListener('click', () => {
            if (confirm('Ní có chắc chắn muốn xóa sạch toàn bộ ký ức, niềm tin của nhân vật này không? Hành động này không thể hoàn tác!')) {
                const agent = getActiveAgent();
                if (agent) {
                    agent.memory.recallable_drawer = [];
                    agent.memory.stm_buffer = [];
                    agent.memory.beliefs = [];
                    agent.memory.shattered_beliefs = [];
                    agent.body = 'Bình thường, khỏe mạnh.';
                    agent.body_status = {
                        energy: 10.0,
                        pain: 0.0,
                        hunger: 0.0,
                        thirst: 0.0,
                        toilet_need: 0.0,
                        nausea: 0.0,
                        dyspnea: 0.0,
                        temp_sensation: 'Bình thường',
                    };
                    agent.updateDynamicMentalState();
                    saveActiveAgentState();
                    toastr.success('Đã reset bộ não nhân vật thành công!');
                    refreshMemoryUIWrapper();
                }
            }
        });
    }

    const clearLogsBtn = document.getElementById('cog_logs_clear_btn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearAnimaLogs);
    }

    const copyLogsBtn = document.getElementById('cog_logs_copy_btn');
    if (copyLogsBtn) {
        copyLogsBtn.addEventListener('click', copyAnimaLogsToClipboard);
    }

    const downloadLogsBtn = document.getElementById('cog_logs_download_btn');
    if (downloadLogsBtn) {
        downloadLogsBtn.addEventListener('click', downloadAnimaLogsAsFile);
    }
}

async function init() {
    try {
        if (typeof SillyTavern === 'undefined') {
            console.error("Anima Engine: SillyTavern global object not found! Cannot initialize.");
            return;
        }
        const context = SillyTavern.getContext();
        const { eventSource, event_types, renderExtensionTemplateAsync } = context;

        logAnima('info', 'System', 'Khởi chạy Anima Engine v0.11.0 (Tái cấu trúc Mô-đun chuyên nghiệp)...');

        const container = document.createElement('div');
        container.id = 'cognitive_dashboard_container';
        container.classList.add('extension_container');

        logAnima('info', 'System', `Đang nạp template từ MODULE_NAME: ${MODULE_NAME}`);
        try {
            const templateHtml = await renderExtensionTemplateAsync(MODULE_NAME, 'template');
            container.innerHTML = templateHtml;
        } catch (templateErr) {
            logAnima('error', 'System', `Không thể nạp template: ${templateErr.message}`);
            throw templateErr;
        }

        const extSettings = document.getElementById('extensions_settings');
        if (extSettings) {
            extSettings.appendChild(container);
            logAnima('success', 'System', 'Đã chèn panel Anima vào extensions_settings');
        } else {
            console.warn('Anima Engine: Không tìm thấy phần tử #extensions_settings trong DOM!');
            document.body.appendChild(container);
        }

        ADSettingsPanel.init();

        orchestrator = new EventOrchestrator({
            getActiveAgent,
            saveActiveAgentState,
            refreshMemoryUIWrapper,
            resetActiveAgent,
            logAnima,
        });

        // Bug 1: orchestrator owns event registration, so we get cleanup for free
        orchestrator.attachEventHandlers({ eventSource, event_types });

        setupTabs();
        setupEventHandlers();
        refreshLogsUi();

        setTimeout(() => {
            const agent = getActiveAgent();
            if (agent) {
                startChatObserver(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
                startSubconsciousTicker(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
                refreshMemoryUIWrapper();
            }
        }, TIMING.INIT_DELAY_MS);
    } catch (error) {
        console.error('Anima Engine Init Error:', error);
        // Bug 5: removed alert() — non-blocking feedback only
        if (typeof toastr !== 'undefined') {
            toastr.error('Anima Engine failed to initialize: ' + error.message);
        }
        if (typeof logAnima !== 'undefined') {
            logAnima('error', 'System', `Init failed: ${error.message}\n${error.stack}`);
        }
    }
}

jQuery(function () {
    init();
});
