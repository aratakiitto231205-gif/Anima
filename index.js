import { eventSource, event_types, generateQuietPrompt, getRequestHeaders } from '../../../../script.js';
import { renderExtensionTemplateAsync, writeExtensionField } from '../../../extensions.js';

// Core modules
import { CognitiveAgent } from './src/core/CognitiveAgent.js';
import { getCharacterEnvironment, saveCharacterEnvironment } from './src/services/EnvironmentService.js';
import { executeTimeJump } from './src/services/TimeJumpService.js';
import { refreshMemoryUI, refreshEnvironmentUI, appendLogToUi } from './src/ui/DashboardUI.js';
import { startChatObserver } from './src/ui/DOMAutoHealing.js';
import { handleAdminMessage } from './src/backstage/BackstageConsole.js';
import { startSubconsciousTicker } from './src/backstage/SubconsciousTicker.js';

// Orchestration modules
import { EventOrchestrator } from './src/orchestration/EventOrchestrator.js';

const MODULE_NAME = 'third-party/cognitive-dashboard';
let activeAgent = null;
let activeEnvironment = null;
let orchestrator = null;

// ==========================================
// ANIMA LOGGER ENGINE v10.0
// ==========================================
const MAX_LOG_SIZE = 150;
let animaLogs = [];

try {
    const savedLogs = sessionStorage.getItem('anima_engine_session_logs');
    if (savedLogs) {
        animaLogs = JSON.parse(savedLogs);
    }
} catch (e) {
    console.warn("Anima Logger: Failed to load session logs:", e);
}

export function logAnima(level, moduleName, message, detail = null) {
    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString();

    const logEntry = {
        time: timeStr,
        level: level.toUpperCase(),
        module: moduleName,
        message: message,
        detail: detail ? (typeof detail === 'object' ? JSON.stringify(detail) : String(detail)) : null
    };

    animaLogs.push(logEntry);
    if (animaLogs.length > MAX_LOG_SIZE) {
        animaLogs.shift();
    }

    try {
        sessionStorage.setItem('anima_engine_session_logs', JSON.stringify(animaLogs));
    } catch (e) {}

    const colors = {
        'INFO': 'color: #94a3b8;',
        'SUCCESS': 'color: #10b981; font-weight: bold;',
        'WARNING': 'color: #f59e0b; font-weight: bold;',
        'ERROR': 'color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.1);',
        'COGNITIVE': 'color: #a855f7; font-weight: bold;'
    };

    const consoleColor = colors[logEntry.level] || 'color: #cbd5e1;';
    console.log(
        `%c[Anima Engine - ${logEntry.level}]%c [${logEntry.module}] ${logEntry.message}`,
        `${consoleColor}`,
        'color: unset;',
        detail || ''
    );

    appendLogToUi(logEntry);
}

function refreshLogsUi() {
    const container = document.getElementById('cog_logs_container');
    if (!container) return;
    container.innerHTML = '';
    animaLogs.forEach(log => appendLogToUi(log));
}

function clearAnimaLogs() {
    animaLogs = [];
    try {
        sessionStorage.removeItem('anima_engine_session_logs');
    } catch (e) {}
    refreshLogsUi();
    logAnima('success', 'Logger', 'Đã làm sạch nhật ký nhận thức.');
}

// ==========================================
// AGENT STATE MANAGEMENT
// ==========================================
function getCharacterMemory() {
    if (typeof SillyTavern === 'undefined') return null;
    const context = SillyTavern.getContext();
    if (!context || context.characterId === undefined || !context.characters) return null;
    const character = context.characters[context.characterId];
    if (!character) return null;
    return character.data?.extensions?.cognitive_memory || null;
}

function getActiveAgent() {
    if (activeAgent) return activeAgent;
    const memory = getCharacterMemory();
    if (!memory) return null;
    activeAgent = new CognitiveAgent(memory);
    return activeAgent;
}

function saveActiveAgentState() {
    if (!activeAgent || typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    if (!context || context.characterId === undefined || !context.characters) return;

    const state = activeAgent.serialize();
    const character = context.characters[context.characterId];
    if (character) {
        if (!character.data) character.data = {};
        if (!character.data.extensions) character.data.extensions = {};
        character.data.extensions.cognitive_memory = state;
    }
    writeExtensionField(context.characterId, 'cognitive_memory', state);
}

function refreshMemoryUIWrapper() {
    refreshMemoryUI(getActiveAgent(), activeEnvironment, saveActiveAgentState);
}

// ==========================================
// GLOBAL INTERCEPTOR FOR TEXT COMPLETION
// ==========================================
globalThis.animaCognitiveInterceptor = async function(chat, contextSize, abort, type) {
    if (orchestrator) {
        await orchestrator.onPromptInterceptor(chat);
    }
};

// ==========================================
// UI SETUP
// ==========================================
function setupTabs() {
    const tabBtns = document.querySelectorAll('.cog-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const tabName = this.getAttribute('data-tab');
            document.querySelectorAll('.cog-tab-content').forEach(c => c.style.display = 'none');

            const targetContent = document.getElementById(`cog_tab_${tabName}_content`);
            if (targetContent) {
                targetContent.style.display = 'flex';
            }
        });
    });

    // Toggle controls
    const awareToggle = document.getElementById('cog_opt_self_aware');
    if (awareToggle) {
        const agent = getActiveAgent();
        if (agent) {
            awareToggle.checked = agent.consciousness.self_awareness;
        }
        awareToggle.addEventListener('change', function() {
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
        bgConToggle.addEventListener('change', function() {
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
        splitToggle.addEventListener('change', function() {
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
    // Backstage Chat
    const adminSendBtn = document.getElementById('cog_admin_send_btn');
    if (adminSendBtn) {
        adminSendBtn.addEventListener('click', () => handleAdminMessage(getActiveAgent(), activeEnvironment, { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper }));
    }
    const adminInputEl = document.getElementById('cog_admin_chat_input');
    if (adminInputEl) {
        adminInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAdminMessage(getActiveAgent(), activeEnvironment, { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper });
        });
    }

    // Time Jump
    document.querySelectorAll('.cog-time-jump-btn').forEach(btn => {
        btn.addEventListener('click', function() {
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

    // Save Body & Reset Memory
    const saveBodyBtn = document.getElementById('cog_save_body');
    if (saveBodyBtn) {
        saveBodyBtn.addEventListener('click', () => {
            const textEl = document.getElementById('cog_db_body');
            const agent = getActiveAgent();
            if (textEl && agent) {
                agent.body = textEl.value.trim();
                saveActiveAgentState();
                toastr.success("Đã cập nhật trạng thái cơ thể thành công!");
                refreshMemoryUIWrapper();
            }
        });
    }

    const clearMemBtn = document.getElementById('cog_clear_memory');
    if (clearMemBtn) {
        clearMemBtn.addEventListener('click', () => {
            if (confirm("Ní có chắc chắn muốn xóa sạch toàn bộ ký ức, niềm tin của nhân vật này không? Hành động này không thể hoàn tác!")) {
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
                        temp_sensation: 'Bình thường'
                    };
                    agent.updateDynamicMentalState();
                    saveActiveAgentState();
                    toastr.success("Đã reset bộ não nhân vật thành công!");
                    refreshMemoryUIWrapper();
                }
            }
        });
    }

    const clearLogsBtn = document.getElementById('cog_logs_clear_btn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearAnimaLogs);
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
async function init() {
    logAnima('info', 'System', 'Khởi chạy Anima Engine v10.0 (Tái cấu trúc Mô-đun chuyên nghiệp)...');

    const container = document.createElement('div');
    container.id = 'cognitive_dashboard_container';
    container.classList.add('extension_container');
    container.innerHTML = await renderExtensionTemplateAsync(MODULE_NAME, 'template');

    const extSettings = document.getElementById('extensions_settings');
    if (extSettings) {
        extSettings.appendChild(container);
    }

    // Initialize orchestrator
    orchestrator = new EventOrchestrator({
        getActiveAgent,
        saveActiveAgentState,
        refreshMemoryUIWrapper,
        logAnima
    });

    // Register ST events
    eventSource.on(event_types.CHAT_CHANGED, () => {
        activeAgent = null;
        orchestrator.lastProcessedMessageId = -1;
        orchestrator.lastProcessedMessageText = '';
        orchestrator.lastProcessedUserMsg = '';
        orchestrator.onChatChanged();
    });

    eventSource.on(event_types.MESSAGE_RECEIVED, (msgId) => orchestrator.onMessageReceived(msgId));
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (msgId) => orchestrator.onMessageRendered(msgId));
    eventSource.on(event_types.USER_MESSAGE_RENDERED, (msgId) => orchestrator.onMessageRendered(msgId));
    eventSource.on(event_types.MESSAGE_UPDATED, (msgId) => orchestrator.onMessageReceived(msgId));
    eventSource.on(event_types.MESSAGE_EDITED, (msgId) => orchestrator.onMessageReceived(msgId));

    eventSource.on(event_types.GENERATION_STARTED, () => orchestrator.onGenerationStarted());
    eventSource.on(event_types.STREAM_TOKEN_RECEIVED, (token) => orchestrator.onStreamTokenReceived(token));

    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, (data) => orchestrator.onChatCompletionPromptReady(data));
    eventSource.on(event_types.GENERATE_BEFORE_COMBINE_PROMPTS, (data) => orchestrator.onTextCompletionPromptReady(data));

    setupTabs();
    setupEventHandlers();
    refreshLogsUi();

    // Initialize observer and ticker
    setTimeout(() => {
        const agent = getActiveAgent();
        if (agent) {
            startChatObserver(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
            startSubconsciousTicker(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
            refreshMemoryUIWrapper();
        }
    }, 1000);
}

jQuery(function() {
    init();
});
