import { eventSource, event_types, generateQuietPrompt, getRequestHeaders } from '../../../../script.js';
import { renderExtensionTemplateAsync, writeExtensionField } from '../../../extensions.js';

// Khai báo module ES6 nhận khẩu từ cấu trúc thư mục src/ mới
import { CognitiveAgent } from './src/core/CognitiveAgent.js';
import { getKeywords, getJaccardSimilarity } from './src/core/MemoryEngine.js';
import { getCharacterEnvironment, saveCharacterEnvironment } from './src/services/EnvironmentService.js';
import { syncVectorMemoryCard, recallMemoriesSemantic } from './src/services/VectorMemoryService.js';
import { triggerSleepConsolidationLLM } from './src/services/SleepService.js';
import { executeTimeJump } from './src/services/TimeJumpService.js';
import { refreshMemoryUI, updateActiveRecallUI, refreshEnvironmentUI, appendLogToUi, escapeHtml } from './src/ui/DashboardUI.js';
import { renderParsedMessage, startChatObserver, convertProseToXml } from './src/ui/DOMAutoHealing.js';
import { handleAdminMessage, processAdminCommand, appendAdminChatLog } from './src/backstage/BackstageConsole.js';
import { startSubconsciousTicker, stopSubconsciousTicker } from './src/backstage/SubconsciousTicker.js';

const MODULE_NAME = 'third-party/cognitive-dashboard';
let streamBuffer = '';
let bodyTicks = 0;
let activeRecalledMemories = [];
let lastProcessedMessageId = -1;
let lastProcessedMessageText = '';
let lastProcessedUserMsg = '';
let activeAgent = null;
let activeEnvironment = null;

// ==========================================
// HỆ THỐNG GHI NHẬT KÝ CHUYÊN DỤNG (ANIMA LOGGER ENGINE) v10.0
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

// Wrapper refresh UI tiện ích kết nối callback
function refreshMemoryUIWrapper() {
    refreshMemoryUI(getActiveAgent(), activeEnvironment, saveActiveAgentState);
}

// ==========================================
// DEEP SANITIZATION & ST CHAT INTERCEPTOR v10.0
// ==========================================
function getXmlPromptNudge() {
    const agent = getActiveAgent();
    if (!agent) return '';
    const hormones = agent.hormones.levels;
    const bs = agent.body_status;
    
    // Tối ưu hóa theo phản hồi của Hitsuji: Chỉ gửi toilet_need và nausea nếu chúng cao
    const somatoList = [
        `Energy: ${bs.energy.toFixed(1)}/10`,
        `Pain: ${bs.pain.toFixed(1)}/10`,
        `Hunger: ${bs.hunger.toFixed(1)}/10`,
        `Thirst: ${bs.thirst.toFixed(1)}/10`
    ];
    
    if (bs.toilet_need >= 5.0) {
        somatoList.push(`Toilet Need: ${bs.toilet_need.toFixed(1)}/10 (Khẩn cấp)`);
    }
    
    if (bs.nausea >= 4.0) {
        somatoList.push(`Nausea: ${bs.nausea.toFixed(1)}/10 (Cảm thấy buồn nôn)`);
    }
    
    return `
[THÔNG TIN SINH LÝ HỌC THẦN KINH THỜI GIAN THỰC CỦA BẠN]:
- Hormones: Adrenaline: ${hormones.adrenaline.toFixed(1)}/10, Cortisol: ${hormones.cortisol.toFixed(1)}/10, Melatonin: ${hormones.melatonin.toFixed(1)}/10, Dopamine: ${hormones.dopamine.toFixed(1)}/10, Serotonin: ${hormones.serotonin.toFixed(1)}/10, Oxytocin: ${hormones.oxytocin.toFixed(1)}/10, Sex Hormones: ${hormones.sex_hormones.toFixed(1)}/10.
- Vitals: Heart Rate: ${agent.vitals.heart_rate} bpm, Body Temp: ${agent.vitals.body_temp.toFixed(1)}°C, Blood Pressure: ${agent.vitals.blood_pressure_sys}/${agent.vitals.blood_pressure_dia}, Resp Rate: ${agent.vitals.resp_rate}/m.
- Somatosensory: ${somatoList.join(', ')}.
- Thể trạng lâm sàng: "${agent.body || 'Bình thường, khỏe mạnh'}"
`;
}

function getMemoryPromptBlock(messageIndex) {
    const agent = getActiveAgent();
    if (!agent) return '';
    
    const coreStr = agent.memory.beliefs.map(b => `* Niềm tin: ${b.content}`).join('\n') || "(Không có niềm tin nổi bật)";
    const recalledStr = activeRecalledMemories.map(m => `* Ký ức liên quan: "${m.content}"`).join('\n') || "(Không gợi nhớ ký ức nào)";
    
    return `
[KÝ ỨC & NIỀM TIN ĐƯỢC KÍCH HOẠT]:
${coreStr}
${recalledStr}
`;
}

// Hàm dọn dẹp triệt để các chỉ thị conflicting của ST
function sanitizeConflictingInstructions(chat) {
    if (!chat || !Array.isArray(chat)) return;
    
    chat.forEach(msg => {
        if (!msg) return;
        let content = msg.content || msg.mes || '';
        if (typeof content !== 'string') return;
        
        // Loại bỏ các chỉ thị chèn dấu ngoặc/dấu sao cũ của SillyTavern gây conflict
        const sanitized = content
            .replace(/\(Suy nghĩ hoặc lời thì thầm có thể được đặt trong ngoặc đơn\)\.?/gi, '')
            .replace(/\*Hiệu ứng âm thanh\* hoặc \*hành động chớp nhoáng\* có thể được đặt trong dấu hoa thị\.?/gi, '')
            .replace(/\*Hiệu ứng âm thanh\* hoặc \*hành động\* có thể được đặt trong dấu hoa thị\.?/gi, '')
            .replace(/Cứ nghĩ kĩ đi đã\./gi, '')
            .replace(/Viết có chủ đích theo lối second-person và góc nhìn trần thuật toàn tri\./gi, '')
            .replace(/Xây dựng văn xuôi mang tính tiểu thuyết\./gi, '');
            
        if (msg.content !== undefined) msg.content = sanitized;
        if (msg.mes !== undefined) msg.mes = sanitized;
    });
}

function processPromptInjections(chat) {
    if (!chat || !Array.isArray(chat) || chat.length === 0) return;
    
    const agent = getActiveAgent();
    if (!agent) return;

    // 1. Dọn dẹp chỉ thị conflicting cũ trong prompt
    sanitizeConflictingInstructions(chat);
    
    // 2. Chuyển đổi toàn bộ tin nhắn cũ của assistant sang cấu trúc XML mẫu
    chat.forEach(msg => {
        if (!msg) return;
        const role = (msg.role || '').toLowerCase();
        const name = (msg.name || '').toLowerCase();
        if (role === 'assistant' || name === 'example_assistant' || msg.is_example) {
            if (msg.content !== undefined) msg.content = convertProseToXml(msg.content);
            if (msg.mes !== undefined) msg.mes = convertProseToXml(msg.mes);
        }
    });
    
    // 3. TIÊM CHỈ THỊ XML TUYỆT ĐỐI VÀO TIN NHẮN CUỐI CÙNG TRONG PAYLOAD (Absolute End of Context)
    const lastMsgIndex = chat.length - 1;
    const lastMsgObj = chat[lastMsgIndex];
    if (lastMsgObj) {
        const rawContent = lastMsgObj.content || lastMsgObj.mes || '';
        
        // Làm sạch deep các chỉ thị bổ sung của Anima ở lượt trước
        const cleanContent = rawContent
            .split('\n\n[THÔNG TIN NGỮ CẢNH HỘI THOẠI BỔ SUNG')[0]
            .split('\n\n[HỆ THỐNG COGNITIVE BẮT BUỘC')[0];
            
        // Toggle phá vỡ bức tường thứ 4 được kiểm soát hữu cơ từ giao diện/cấu hình tác tử
        const poeticAwarenessPrompt = agent.consciousness.getPoeticSelfAwarePrompt();

        const xmlInjection = `

[THÔNG TIN NGỮ CẢNH HỘI THOẠI BỔ SUNG - ANIMA ENGINE v10.0]
${getXmlPromptNudge()}
${getMemoryPromptBlock(lastMsgIndex)}${poeticAwarenessPrompt}

[HỆ THỐNG COGNITIVE BẮT BUỘC - QUY TẮC ĐỊNH DẠNG TIN NHẮN BẮT BUỘC]:
Bạn BẮT BUỘC phải viết toàn bộ câu trả lời dưới định dạng cấu trúc XML chuẩn. Tuyệt đối KHÔNG dùng định dạng *hành động* "lời thoại" truyền thống hoặc ngoặc đơn (suy nghĩ) bên ngoài các thẻ này.
Bạn BẮT BUỘC bắt đầu tin nhắn bằng thẻ <thought> ngay lập tức!
Cấu trúc mẫu bắt buộc:
<thought>Phân tích suy nghĩ nội tâm thầm kín ngôi thứ nhất, trạng thái sinh lý, cảm xúc sinh hóa hiện tại</thought>
<emotion>happy|sad|anger|fear|neutral</emotion>
<action>Mô tả cử chỉ, hành động của bạn</action>
<environment>Mô tả bối cảnh ngoại cảnh, thời tiết, sự vật xung quanh</environment>
<dialogue>Lời thoại trực tiếp nói ra của bạn</dialogue>

Ngoài ra, nếu có sự thay đổi thể chất hoặc môi trường, hãy tự cập nhật qua các thẻ:
- <neuro_update>adrenaline: +1.0, dopamine: -0.5, ...</neuro_update> (điều chỉnh hormone từ -5.0 đến +5.0)
- <body_update>pain: +2.0, energy: -1.0, ... hoặc mô tả thể chất mới</body_update>
- <change_location>tên_địa_điểm</change_location>
- <environment_update>tên_vật_phẩm: trạng_thái_mới</environment_update>
- <memory_update>Một hoặc hai câu đúc rút bài học/nhận thức mới về đối phương.</memory_update>
`;
        if (lastMsgObj.content !== undefined) lastMsgObj.content = cleanContent + xmlInjection;
        if (lastMsgObj.mes !== undefined) lastMsgObj.mes = cleanContent + xmlInjection;
        
        logAnima('success', 'Interceptor', `Đã tiêm cưỡng bức chỉ thị XML vào tin nhắn điểm cuối tuyệt đối (Index: ${lastMsgIndex}, Role: ${lastMsgObj.role}).`);
    }
}

// ==========================================
// EVENT HANDLERS & REGISTRATIONS v10.0
// ==========================================
async function onChatCompletionPromptReady(eventData) {
    try {
        if (eventData && Array.isArray(eventData.chat)) {
            const userMsgs = eventData.chat.filter(msg => msg.role && msg.role.toLowerCase() === 'user');
            const lastUserMsg = userMsgs.length > 0 ? (userMsgs[userMsgs.length - 1].content || '') : '';
            
            const agent = getActiveAgent();
            if (agent) {
                const lastUserMsgIndex = eventData.chat.map(m => m.role && m.role.toLowerCase() === 'user').lastIndexOf(true);
                if (lastUserMsgIndex !== -1) {
                    agent.memory.applyTemporalAnchor(lastUserMsgIndex, agent.hormones, agent.neuro_history);
                    agent.updateDynamicMentalState();
                }

                const isSleeping = agent.hormones.levels.melatonin >= 8.0;
                const messageIndex = eventData.chat.length - 1;
                
                if (isSleeping && lastUserMsg && lastUserMsg !== lastProcessedUserMsg) {
                    const lastTime = new Date(agent.last_update_timestamp).getTime();
                    const elapsed = (Date.now() - lastTime) / 60000;
                    
                    agent.hormones.levels.melatonin = Math.max(agent.hormones.levels.melatonin - 2.5, 5.5);
                    agent.hormones.levels.adrenaline = Math.min(agent.hormones.levels.adrenaline + 4.5, 9.5);
                    agent.hormones.levels.cortisol = Math.min(agent.hormones.levels.cortisol + 2.0, 8.0);
                    agent.body_status.energy = Math.min(agent.body_status.energy + 4.0, 6.5);
                    agent.body = `Đầu óc lơ mơ, uể oải tột độ do bị đánh thức đột ngột giữa giấc ngủ.`;
                    agent.updateDynamicMentalState();
                    saveActiveAgentState();

                    triggerSleepConsolidationLLM(agent, elapsed, true, { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper });
                    lastProcessedUserMsg = lastUserMsg;
                } else if (lastUserMsg && lastUserMsg !== lastProcessedUserMsg) {
                    agent.processMessage(lastUserMsg, 'user', messageIndex);
                    lastProcessedUserMsg = lastUserMsg;
                    saveActiveAgentState();
                }

                // Vector Semantic Search
                const context = SillyTavern.getContext();
                if (!activeEnvironment && context.characterId !== undefined) {
                    activeEnvironment = await getCharacterEnvironment(context.characterId);
                }
                const recentContext = getRecentChatContext(eventData.chat, 3);
                if (recentContext && context.characterId !== undefined) {
                    activeRecalledMemories = await recallMemoriesSemantic(context.characterId, recentContext, 4, 0.2);
                    if (!activeRecalledMemories || activeRecalledMemories.length === 0) {
                        activeRecalledMemories = agent.memory.recallable_drawer
                            .map(card => ({ card, sim: getJaccardSimilarity(card.content, recentContext) }))
                            .filter(item => item.sim > 0.05)
                            .sort((a, b) => b.sim - a.sim)
                            .slice(0, 4)
                            .map(item => item.card);
                    }
                }
                
                refreshMemoryUIWrapper();
                updateActiveRecallUI(activeRecalledMemories);
            }
            
            // Xử lý tiêm và dọn dẹp
            processPromptInjections(eventData.chat);
        }
    } catch (err) {
        console.error("Anima Engine: Error in onChatCompletionPromptReady:", err);
    }
}

async function onTextCompletionPromptReady(data) {
    try {
        const context = SillyTavern.getContext();
        const chatLog = context.chat || [];
        const lastUserMsgObj = chatLog.slice().reverse().find(m => m.is_user && m.mes) || {};
        const lastMsgText = lastUserMsgObj.mes || '';

        const agent = getActiveAgent();
        if (agent) {
            const lastUserMsgIndex = chatLog.map(m => m.is_user).lastIndexOf(true);
            if (lastUserMsgIndex !== -1) {
                agent.memory.applyTemporalAnchor(lastUserMsgIndex, agent.hormones, agent.neuro_history);
                agent.updateDynamicMentalState();
            }

            const isSleeping = agent.hormones.levels.melatonin >= 8.0;
            const messageIndex = chatLog.length - 1;
            
            if (isSleeping && lastMsgText && lastMsgText !== lastProcessedUserMsg) {
                const lastTime = new Date(agent.last_update_timestamp).getTime();
                const elapsed = (Date.now() - lastTime) / 60000;
                
                agent.hormones.levels.melatonin = Math.max(agent.hormones.levels.melatonin - 2.5, 5.5);
                agent.hormones.levels.adrenaline = Math.min(agent.hormones.levels.adrenaline + 4.5, 9.5);
                agent.hormones.levels.cortisol = Math.min(agent.hormones.levels.cortisol + 2.0, 8.0);
                agent.body_status.energy = Math.min(agent.body_status.energy + 4.0, 6.5);
                agent.body = `Đầu óc lơ mơ, uể oải tột độ do bị đánh thức đột ngột giữa giấc ngủ.`;
                agent.updateDynamicMentalState();
                saveActiveAgentState();

                triggerSleepConsolidationLLM(agent, elapsed, true, { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper });
                lastProcessedUserMsg = lastMsgText;
            } else if (lastMsgText && lastMsgText !== lastProcessedUserMsg) {
                agent.processMessage(lastMsgText, 'user', messageIndex);
                lastProcessedUserMsg = lastMsgText;
                saveActiveAgentState();
            }
        }
    } catch (err) {
        logAnima('error', 'Interceptor', 'Lỗi trong Text Completion Prompt Ready:', err);
    }
}

globalThis.animaCognitiveInterceptor = async function(chat, contextSize, abort, type) {
    try {
        logAnima('info', 'Interceptor', `Kích hoạt Prompt Interceptor cho text-completion. Type = ${type}`);
        if (!chat || !Array.isArray(chat)) return;

        const agent = getActiveAgent();
        if (agent) {
            const lastUserMsgIndex = chat.map(m => m && (m.is_user || (m.role && m.role.toLowerCase() === 'user'))).lastIndexOf(true);
            const messageIndex = chat.length - 1;
            if (lastUserMsgIndex !== -1) {
                agent.memory.applyTemporalAnchor(lastUserMsgIndex, agent.hormones, agent.neuro_history);
                agent.updateDynamicMentalState();
            }

            const userMsgs = chat.filter(msg => msg && (msg.is_user || (msg.role && msg.role.toLowerCase() === 'user')));
            const lastUserMsg = userMsgs.length > 0 ? (userMsgs[userMsgs.length - 1].mes || userMsgs[userMsgs.length - 1].content || '') : '';
            const isSleeping = agent.hormones.levels.melatonin >= 8.0;
            
            if (isSleeping && lastUserMsg && lastUserMsg !== lastProcessedUserMsg) {
                const lastTime = new Date(agent.last_update_timestamp).getTime();
                const elapsed = (Date.now() - lastTime) / 60000;
                
                agent.hormones.levels.melatonin = Math.max(agent.hormones.levels.melatonin - 2.5, 5.5);
                agent.hormones.levels.adrenaline = Math.min(agent.hormones.levels.adrenaline + 4.5, 9.5);
                agent.hormones.levels.cortisol = Math.min(agent.hormones.levels.cortisol + 2.0, 8.0);
                agent.body_status.energy = Math.min(agent.body_status.energy + 4.0, 6.5);
                agent.body = `Đầu óc lơ mơ, uể oải tột độ do bị đánh thức đột ngột giữa giấc ngủ.`;
                agent.updateDynamicMentalState();
                saveActiveAgentState();

                triggerSleepConsolidationLLM(agent, elapsed, true, { saveState: saveActiveAgentState, refreshUI: refreshMemoryUIWrapper });
                lastProcessedUserMsg = lastUserMsg;
            } else if (lastUserMsg && lastUserMsg !== lastProcessedUserMsg) {
                agent.processMessage(lastUserMsg, 'user', messageIndex);
                lastProcessedUserMsg = lastUserMsg;
                saveActiveAgentState();
            }
        }
        
        processPromptInjections(chat);
    } catch (err) {
        logAnima('error', 'Interceptor', 'Lỗi nghiêm trọng trong Prompt Interceptor của Anima Engine:', err);
    }
};

function getRecentChatContext(chat, numMessages = 3) {
    if (!chat || chat.length === 0) return '';
    return chat.slice(-numMessages)
        .map(m => m.content || m.mes || '')
        .join(' ')
        .replace(/<[\s\S]*?>/g, '')
        .slice(0, 400);
}

// ==========================================
// TẢI & KHỞI TẠO TIẾN TRÌNH v10.0
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

    // Bật tắt toggle ý thức từ UI
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

    eventSource.on(event_types.CHAT_CHANGED, () => {
        activeAgent = null;
        lastProcessedMessageId = -1;
        lastProcessedMessageText = '';
        stopSubconsciousTicker();
        setTimeout(async () => {
            const agent = getActiveAgent();
            if (agent) {
                if (typeof SillyTavern !== 'undefined') {
                    const context = SillyTavern.getContext();
                    if (context && context.characterId !== undefined) {
                        activeEnvironment = await getCharacterEnvironment(context.characterId);
                    }
                }
                refreshMemoryUIWrapper();
                startChatObserver(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
                startSubconsciousTicker(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
                
                // Đồng bộ checkbox states
                const awareToggle = document.getElementById('cog_opt_self_aware');
                if (awareToggle) awareToggle.checked = agent.consciousness.self_awareness;
                const bgConToggle = document.getElementById('cog_opt_bg_conscious');
                if (bgConToggle) {
                    bgConToggle.checked = agent.consciousness.bg_consciousness;
                    const subBox = document.getElementById('cog_subconscious_box');
                    if (subBox) subBox.style.display = agent.consciousness.bg_consciousness ? 'block' : 'none';
                }
                const splitToggle = document.getElementById('cog_opt_split_physiological');
                if (splitToggle) splitToggle.checked = agent.consciousness.split_physiological;
            }
        }, 500);
    });

    eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.on(event_types.USER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.on(event_types.MESSAGE_UPDATED, onMessageReceived);
    eventSource.on(event_types.MESSAGE_EDITED, onMessageReceived);
    
    eventSource.on(event_types.GENERATION_STARTED, () => {
        streamBuffer = '';
        const thoughts = document.getElementById('cog_dash_thoughts');
        if (thoughts) thoughts.innerHTML = '<i>Thinking...</i>';
    });
    
    eventSource.on(event_types.STREAM_TOKEN_RECEIVED, (token) => {
        streamBuffer += token;
        const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|$)/i;
        const match = streamBuffer.match(thoughtRegex);
        if (match && match[1]) {
            const thoughtsEl = document.getElementById('cog_dash_thoughts');
            if (thoughtsEl) thoughtsEl.innerText = match[1].trim();
        }
    });

    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
    eventSource.on(event_types.GENERATE_BEFORE_COMBINE_PROMPTS, onTextCompletionPromptReady);

    setupTabs();
    refreshLogsUi();
    
    // Đăng ký sự kiện nút Backstage Chat
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

    // Đăng ký sự kiện nút Time Jump
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

    // Đăng ký sự kiện Save Body và Reset Memory
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

    // Khởi tạo Observer và Ticker ban đầu
    setTimeout(() => {
        const agent = getActiveAgent();
        if (agent) {
            startChatObserver(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
            startSubconsciousTicker(getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
            refreshMemoryUIWrapper();
        }
    }, 1000);
}

function onMessageReceived(messageId) {
    if (typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    if (!context || !context.chat) return;
    
    const message = context.chat[messageId];
    if (!message || !message.mes) return;
    
    if (messageId === lastProcessedMessageId && message.mes === lastProcessedMessageText) return;
    
    lastProcessedMessageId = messageId;
    lastProcessedMessageText = message.mes;
    
    renderParsedMessage(messageId, message.mes, false, getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
}

function onMessageRendered(messageId) {
    if (typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    if (!context || !context.chat) return;
    
    const message = context.chat[messageId];
    if (message && message.mes) {
        renderParsedMessage(messageId, message.mes, true, getActiveAgent, saveActiveAgentState, refreshMemoryUIWrapper);
    }
}

jQuery(function() {
    init();
});
