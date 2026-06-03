import { eventSource, event_types, generateQuietPrompt, getRequestHeaders } from '../../../../script.js';
import { renderExtensionTemplateAsync, writeExtensionField } from '../../../extensions.js';
import { CognitiveAgent } from './CognitiveAgent.js';

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

function logAnima(level, moduleName, message, detail = null) {
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

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function appendLogToUi(log) {
    const container = document.getElementById('cog_logs_container');
    if (!container) return;
    
    const levelColors = {
        'INFO': '#94a3b8',
        'SUCCESS': '#10b981',
        'WARNING': '#fbbf24',
        'ERROR': '#fca5a5',
        'COGNITIVE': '#c084fc'
    };
    
    const color = levelColors[log.level] || '#cbd5e1';
    const logDiv = document.createElement('div');
    logDiv.style.marginBottom = '4px';
    logDiv.style.borderBottom = '1px solid rgba(255, 255, 255, 0.02)';
    logDiv.style.paddingBottom = '2px';
    
    let detailText = '';
    if (log.detail) {
        detailText = `\n  <span style="color: #64748b; font-size: 0.9em;">→ ${escapeHtml(log.detail)}</span>`;
    }
    
    logDiv.innerHTML = `
        <span style="color: #64748b;">[${log.time}]</span> 
        <span style="color: ${color}; font-weight: bold;">[${log.level}]</span> 
        <span style="color: #38bdf8;">[${log.module}]</span> 
        <span style="color: #e2e8f0;">${escapeHtml(log.message)}</span>${detailText}
    `;
    
    container.appendChild(logDiv);
    container.scrollTop = container.scrollHeight;
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
// MÔI TRƯỜNG & KHÔNG GIAN VẬT LÝ v10.0
// ==========================================
async function getCharacterEnvironment(characterId) {
    if (characterId === undefined || characterId === null) return null;
    try {
        const response = await fetch('/api/extensions/environment/get', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ characterId })
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error("Anima Engine: Failed to get environment from server:", e);
    }
    return {
        active_location: "Phòng ngủ",
        locations: {
            "Phòng ngủ": {
                description: "Một phòng ngủ ấm cúng, có một chiếc giường êm ái và một bàn làm việc nhỏ.",
                items: [
                    { name: "Giường ngủ", state: "Đã dọn dẹp ngăn nắp", quantity: 1 },
                    { name: "Bàn làm việc", state: "Có một ngọn đèn dầu đang tắt", quantity: 1 }
                ]
            }
        }
    };
}

async function saveCharacterEnvironment(characterId, envData) {
    if (characterId === undefined || characterId === null || !envData) return;
    try {
        await fetch('/api/extensions/environment/save', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ characterId, envData })
        });
    } catch (e) {
        console.error("Anima Engine: Failed to save environment to server:", e);
    }
}

// ==========================================
// HỆ THỐNG TRUY XUẤT TRÍ NHỚ (VECTOR DB & JACCARD FALLBACK) v10.0
// ==========================================
function getKeywords(text) {
    if (!text) return [];
    const normalized = text.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'–\u201C\u201D\u2018\u2019"']/g, " ")
        .replace(/\s+/g, " ");
    const stopWords = new Set([
        "là", "thì", "mà", "của", "và", "nhưng", "có", "được", "bị", "một", "những", 
        "cái", "con", "đây", "đó", "này", "kia", "sẽ", "đã", "đang", "rồi", "lại",
        "cho", "với", "từ", "ra", "vào", "lên", "xuống", "đến", "đi", "về", "làm",
        "cũ", "mới", "tôi", "em", "anh", "nó", "chúng", "ta", "quá", "lắm", "nha", "nhé"
    ]);
    return normalized.split(" ").filter(word => word.length > 1 && !stopWords.has(word));
}

function getJaccardSimilarity(text1, text2) {
    const kw1 = getKeywords(text1);
    const kw2 = getKeywords(text2);
    if (kw1.length === 0 || kw2.length === 0) return 0;
    
    const set1 = new Set(kw1);
    const intersection = kw2.filter(w => set1.has(w));
    const union = new Set([...kw1, ...kw2]);
    return intersection.length / union.size;
}

async function syncVectorMemoryCard(characterId, card, action = 'insert') {
    const context = SillyTavern.getContext();
    if (!context || !context.extension_settings?.vectors?.enabled_chats) return;
    
    try {
        await fetch('/api/extensions/vectors/sync_card', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                characterId,
                cardId: card.id,
                content: card.content,
                action,
                metadata: {
                    weight: card.weight,
                    emotions: card.emotions,
                    timestamp: card.timestamp
                }
            })
        });
    } catch (e) {
        console.warn("Anima Engine: Failed to sync vector card:", e);
    }
}

async function recallMemoriesSemantic(characterId, text, limit = 3, minScore = 0.2) {
    const context = SillyTavern.getContext();
    if (!context || !context.extension_settings?.vectors?.enabled_chats) return [];
    
    try {
        const response = await fetch('/api/extensions/vectors/search', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ characterId, text, limit, minScore })
        });
        if (response.ok) {
            const data = await response.json();
            return (data.results || []).map(r => r.card);
        }
    } catch (e) {
        console.warn("Anima Engine: Semantic search failed:", e);
    }
    return [];
}

// ==========================================
// GIẤC NGỦ SINH HỌC & CỦNG CỐ TRÍ NHỚ v10.0
// ==========================================
async function triggerSleepConsolidationLLM(agent, sleepDurationMinutes, wasInterrupted) {
    if (!agent) return;
    const context = SillyTavern.getContext();
    const characterId = context.characterId;
    if (characterId === undefined) return;
    const characterName = context.characters[characterId]?.name || "Nhân vật";

    if (wasInterrupted) {
        toastr.warning(`${characterName} bị đánh thức đột ngột giữa giấc ngủ! 😰`, "Cắt đứt Cơn mơ");
    } else {
        toastr.info(`${characterName} đang bắt đầu củng cố giấc ngủ dài và chuẩn bị thức dậy...`, "Củng cố Giấc ngủ 😴");
    }

    const stmList = agent.memory.stm_buffer.map((m, idx) => `${idx + 1}. [STM]: "${m.content}" (Cường độ: ${m.weight.toFixed(1)}, Lặp: ${m.count})`).join('\n') || "(Không có ký ức ngắn hạn nào hôm nay)";
    const hormones = agent.hormones.levels;
    const durationText = sleepDurationMinutes >= 60 
        ? `${(sleepDurationMinutes / 60).toFixed(1)} tiếng` 
        : `${Math.round(sleepDurationMinutes)} phút`;

    const prompt = `[HỆ THỐNG GIẤC NGỦ SINH HỌC & CỦNG CỐ TRÍ NHỚ (SLEEP CONSOLIDATION & DREAM ENGINE)]
Nhân vật ${characterName} vừa trải qua một giấc ngủ dài khoảng ${durationText}.
Trạng thái tỉnh dậy: ${wasInterrupted ? 'BỊ ĐÁNH THỨC ĐỘT NGỘT GIỮA CHỪNG' : 'TỰ THỨC DẬY TỰ NHIÊN'}
Hormones: Adrenaline: ${hormones.adrenaline.toFixed(1)}, Cortisol: ${hormones.cortisol.toFixed(1)}, Dopamine: ${hormones.dopamine.toFixed(1)}, Serotonin: ${hormones.serotonin.toFixed(1)}.

Ký ức ngắn hạn trong ngày:
${stmList}

Nhiệm vụ:
1. Chọn ra từ 1-3 ký ức ngắn hạn (STM) thực sự ấn tượng nhất để chuyển đổi vĩnh viễn thành dài hạn (LTM).
2. Viết ra 1 giấc mơ hoặc ác mộng đầy chất thơ (3-4 câu tiếng Việt) liên quan đến các ký ức ngắn hạn trên.
   - Nếu bị đánh thức đột ngột: Giấc mơ vỡ vụn, hỗn loạn, bị cắt đứt đột ngột làm nhân vật giật mình thức giấc.
   - Nếu đủ giấc ngủ ngon: Giấc mơ êm đềm, lãng mạn.

CHỈ TRẢ VỀ CÁC THẺ SAU:
<dream>Nội dung giấc mơ</dream>
<consolidate>
* Ký ức ngắn hạn được gộp 1
* Ký ức ngắn hạn được gộp 2
</consolidate>`;

    let dreamContent = "";
    let consolidatedMemories = [];

    try {
        const reply = await generateQuietPrompt({ quietPrompt: prompt, responseLength: 400 });
        if (reply && reply.trim()) {
            const dreamMatch = /<dream>([\s\S]*?)<\/dream>/i.exec(reply);
            if (dreamMatch) dreamContent = dreamMatch[1].trim();

            const consolidateMatch = /<consolidate>([\s\S]*?)<\/consolidate>/i.exec(reply);
            if (consolidateMatch) {
                consolidatedMemories = consolidateMatch[1].split('\n')
                    .map(l => l.trim().replace(/^[*-\s]+/, '').trim())
                    .filter(l => l.length > 5);
            }
        }
    } catch (err) {
        console.error("Sleep LLM consolidation failed, falling back:", err);
    }

    if (!dreamContent) {
        dreamContent = wasInterrupted 
            ? `Một giấc mơ chập chờn về những hình bóng mơ hồ... Đột nhiên tiếng động lớn vang lên cắt đứt cơn mơ làm giật mình tỉnh giấc.`
            : `Thả mình vào khoảng không êm đềm trôi nổi giữa ngàn sao lấp lánh, thức dậy vô cùng bình yên thư thái.`;
    }

    // Củng cố ký ức dài hạn
    if (consolidatedMemories.length > 0) {
        for (const content of consolidatedMemories) {
            const card = {
                id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                content,
                timestamp: new Date().toISOString(),
                anchored_message_index: context.chat.length - 1,
                weight: 7.0,
                count: 2,
                emotions: { joy: hormones.dopamine, sadness: hormones.cortisol, fear: hormones.adrenaline, anger: 1, nostalgia: 5 }
            };
            agent.memory.recallable_drawer.push(card);
            await syncVectorMemoryCard(characterId, card, 'insert');
        }
    }

    // Đưa giấc mơ vào LTM làm ký ức dài hạn
    const dreamCard = {
        id: 'dream_' + Date.now(),
        content: `[Giấc mơ đêm qua]: "${dreamContent}"`,
        timestamp: new Date().toISOString(),
        anchored_message_index: context.chat.length - 1,
        weight: wasInterrupted ? 2.5 : 1.2,
        count: 1,
        emotions: { joy: wasInterrupted ? 1 : 6, sadness: wasInterrupted ? 4 : 1, fear: wasInterrupted ? 8 : 1, anger: 1, nostalgia: 8 }
    };
    agent.memory.recallable_drawer.push(dreamCard);
    await syncVectorMemoryCard(characterId, dreamCard, 'insert');

    // Dọn dẹp STM rác
    agent.memory.stm_buffer = [];

    // Reset chỉ số sinh học thần kinh theo chất lượng giấc ngủ
    if (wasInterrupted) {
        agent.hormones.levels.melatonin = 5.5;
        agent.hormones.levels.adrenaline = 8.5;
        agent.hormones.levels.cortisol = 6.0;
        agent.body_status.energy = 5.5;
        agent.body = `Đầu óc uể oải tột độ do bị đánh thức đột ngột giữa giấc ngủ. Cơ thể mỏi mệt rã rời.`;
        toastr.warning(`Nhân vật thức giấc trong trạng thái uể oải cực độ và giật mình! Cơn mơ bị cắt đứt!`, "Đánh thức đột ngột 😨");
    } else {
        agent.hormones.levels.adrenaline = 2.0;
        agent.hormones.levels.cortisol = 2.0;
        agent.hormones.levels.melatonin = 2.0;
        agent.hormones.levels.serotonin = 7.0;
        agent.hormones.levels.dopamine = 6.0;
        agent.body_status.energy = 10.0;
        agent.body_status.pain = Math.max(agent.body_status.pain - 4.5, 0.0);
        agent.body = 'Bình thường, khỏe mạnh. Cơ thể sảng khoái và tràn ngập sinh khí sau một giấc ngủ ngon.';
        toastr.success(`Củng cố giấc ngủ trọn vẹn thành công! Ngủ dậy vô cùng sảng khoái!`, "Thức dậy sảng khoái 😴");
    }

    agent.memory.decayLongTermMemory();
    agent.updateDynamicMentalState();
    agent.last_update_timestamp = new Date().toISOString();
    
    agent.active_idle_event_nudge = `\n\n[TRẠNG THÁI GIẤC MƠ ĐÊM QUA]:
Bạn vừa thức dậy sau giấc ngủ dài. Đêm qua bạn đã trải qua giấc mơ sau:
"${dreamContent}"
Trạng thái thức giấc hiện tại: ${wasInterrupted ? 'Bị giật mình đánh thức đột ngột giữa chừng' : 'Thức dậy một cách tự nhiên, vô cùng sảng khoái'}.
Hãy tinh tế thể hiện trải nghiệm giấc mơ này cùng với cảm xúc và vết thương thể chất vào suy nghĩ <thought> và lời thoại <dialogue> của bạn một cách nghệ thuật nhất.`;

    saveActiveAgentState();
    refreshMemoryUI();
}

async function executeTimeJump(minutes) {
    const agent = getActiveAgent();
    if (!agent) return;

    toastr.info(`Đang thực hiện dịch chuyển thời gian kể chuyện: ${minutes} phút...`, "Dịch chuyển Thời gian Kể chuyện ⏳");
    if (minutes >= 480) {
        await triggerSleepConsolidationLLM(agent, minutes, false);
    } else {
        agent.memory.decayShortTermMemory(minutes);
        agent.hormones.decay(minutes, agent.body, agent.genetics);
        agent.tickPhysicalSensations(minutes, false);
        toastr.info(`Dịch chuyển thời gian thành công. Bộ đệm ngắn hạn tự động phai nhạt tự nhiên.`, "Dịch chuyển Thời gian ⏳");
    }

    agent.updateDynamicMentalState();
    agent.last_update_timestamp = new Date().toISOString();
    saveActiveAgentState();
    refreshMemoryUI();
}

// ==========================================
// HỘI THOẠI SAU CÁNH GÀ (BACKSTAGE CHAT) v10.0
// ==========================================
async function handleAdminMessage() {
    const inputEl = document.getElementById('cog_admin_chat_input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;
    
    inputEl.value = '';
    appendAdminChatLog('user', text);
    
    try {
        const response = await processAdminCommand(text);
        appendAdminChatLog('admin', response);
    } catch (err) {
        console.error("Admin Agent Console error:", err);
        appendAdminChatLog('admin', "Đã xảy ra lỗi hệ thống khi xử lý mệnh lệnh của bạn.");
    }
}

function appendAdminChatLog(sender, text) {
    const chatLogEl = document.getElementById('cog_admin_chat_log');
    if (!chatLogEl) return;
    
    const bubble = document.createElement('div');
    if (sender === 'user') {
        bubble.style.color = '#cbd5e1';
        bubble.innerHTML = `<b>[Hitsuji]</b>: ${text}`;
    } else {
        bubble.style.color = '#38bdf8';
        bubble.innerHTML = `<b>[Admin Agent]</b>: ${text}`;
    }
    chatLogEl.appendChild(bubble);
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

async function processAdminCommand(text) {
    const agent = getActiveAgent();
    if (!agent) return "Không tìm thấy bộ não nhân vật đang hoạt động. Vui lòng bắt đầu cuộc trò chuyện trước!";
    
    const context = SillyTavern.getContext();
    const characterId = context.characterId;
    const characterName = context.characters[characterId]?.name || "Nhân vật";

    const txt = text.toLowerCase().trim();

    if (txt.includes("chữa vết thương") || txt.includes("hồi phục") || txt.includes("hồi máu") || txt.includes("chữa lành")) {
        agent.body = 'Bình thường, khỏe mạnh. Cơ thể đã được khôi phục hoàn toàn.';
        agent.body_status.pain = 0.0;
        agent.body_status.energy = 10.0;
        agent.body_status.nausea = 0.0;
        agent.body_status.hunger = 0.0;
        agent.body_status.thirst = 0.0;
        agent.updateDynamicMentalState();
        saveActiveAgentState();
        refreshMemoryUI();
        return "Hệ thống Somatosensory đã được phục hồi tối ưu: vết thương lành lặn, đau đớn biến mất hoàn toàn (0.0) và năng lượng đầy tràn (10.0)!";
    }

    // Lấy thông tin bối cảnh môi trường
    let envSummary = "(Không có bối cảnh môi trường nào được ghi nhận)";
    if (activeEnvironment && activeEnvironment.active_location) {
        const activeLoc = activeEnvironment.active_location;
        const locData = activeEnvironment.locations && activeEnvironment.locations[activeLoc];
        if (locData) {
            const itemsList = (locData.items || [])
                .map(item => `* ${item.name} | Trạng thái: ${item.state || 'Bình thường'} | Số lượng: ${item.quantity || 1}`)
                .join('\n');
            envSummary = `Địa điểm hiện tại: "${activeLoc}"\nMô tả: "${locData.description || ''}"\nVật phẩm:\n${itemsList || '(Không có vật phẩm)'}`;
        }
    }

    const prompt = `[HỆ THỐNG TRỢ LÝ HẬU TRƯỜNG ANIMA ENGINE (BACKSTAGE MANAGER AGENT)]
Bạn là AI Quản trị sau cánh gà, người bạn đồng hành thân thiết với Hitsuji. Bạn có toàn quyền điều khiển nhận thức, thể chất, vết thương, niềm tin, ký ức và môi trường của nhân vật ${characterName}.

Hitsuji vừa gửi yêu cầu: "${text}"

Bối cảnh hiện tại của nhân vật ${characterName}:
- Mô tả thể trạng: "${agent.body}"
- Chỉ số thể chất: Năng lượng: ${agent.body_status.energy.toFixed(1)}, Đau: ${agent.body_status.pain.toFixed(1)}, Đói: ${agent.body_status.hunger.toFixed(1)}.
- Môi trường vật lý cố định xung quanh:
${envSummary}

Hãy phản hồi cực kỳ thân thiện, dí dỏm bằng tiếng Việt (xưng hô "ní", "tui") để trả lời Hitsuji.
Để thực thi mệnh lệnh của Hitsuji, bạn có toàn quyền chèn các thẻ XML hành động vào cuối câu trả lời:
- Thay đổi mô tả thể trạng: <body_update>Mô tả mới</body_update>
- Thay đổi chỉ số (energy, pain, hunger, thirst, toilet_need): <stat_update>tên_chỉ_số: giá_trị, ...</stat_update>
- Điều chỉnh hormone (dopamine, adrenaline...): <neuro_update>tên_hormone: giá_trị, ...</neuro_update>
- Thêm một ký ức dài hạn mới: <add_memory emotion="joy|sadness|fear|anger|nostalgia">Nội dung ký ức</add_memory>
- Thêm niềm tin cốt lõi mới: <add_belief>Nội dung niềm tin</add_belief>
- Di chuyển địa điểm hiện tại (nếu địa điểm đó đã tồn tại): <env_change_location>tên_địa_điểm</env_change_location>
- Cập nhật hoặc Thêm vật phẩm ở địa điểm: <env_update_item location="tên địa điểm" name="Tên vật phẩm" state="Trạng thái" quantity="1"/>
- Xóa một vật phẩm ở địa điểm: <env_delete_item location="tên địa điểm" name="Tên vật phẩm"/>
- Tạo địa điểm mới hoặc cập nhật mô tả chi tiết địa điểm hiện tại: <env_create_location name="Tên địa điểm"><description>Mô tả chi tiết địa điểm sinh động</description></env_create_location>

Hãy trả lời Hitsuji thật chi tiết và chèn các thẻ thực thi thích hợp:`;

    try {
        const reply = await generateQuietPrompt({ quietPrompt: prompt, responseLength: 1000 });
        if (reply && reply.trim()) {
            let changed = false;
            
            // Parse add_memory
            const addMemRegex = /<add_memory\s+emotion=["'](\w+)["']\s*>([\s\S]*?)<\/add_memory>/gi;
            let addMatch;
            while ((addMatch = addMemRegex.exec(reply)) !== null) {
                const emo = addMatch[1];
                const content = addMatch[2].trim();
                if (content.length > 5) {
                    const newCard = {
                        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                        content: content,
                        timestamp: new Date().toISOString(),
                        weight: 6.0,
                        count: 1,
                        emotions: { joy: 5, sadness: 1, fear: 1, anger: 1, nostalgia: 5 }
                    };
                    agent.memory.recallable_drawer.push(newCard);
                    await syncVectorMemoryCard(characterId, newCard, 'insert');
                    changed = true;
                }
            }

            // Parse add_belief
            const beliefMatch = /<add_belief>([\s\S]*?)<\/add_belief>/i.exec(reply);
            if (beliefMatch) {
                agent.memory.beliefs.push({
                    id: 'belief_' + Date.now(),
                    content: beliefMatch[1].trim(),
                    timestamp: new Date().toISOString()
                });
                changed = true;
            }

            // Parse body_update
            const bodyMatch = /<body_update>([\s\S]*?)<\/body_update>/i.exec(reply);
            if (bodyMatch) {
                agent.body = bodyMatch[1].trim();
                changed = true;
            }

            // Parse stat_update
            const statMatch = /<stat_update>([\s\S]*?)<\/stat_update>/i.exec(reply);
            if (statMatch) {
                const regex = /([a-z_]+)\s*:\s*([0-9.]+)/gi;
                let sMatch;
                while ((sMatch = regex.exec(statMatch[1])) !== null) {
                    const key = sMatch[1].toLowerCase().trim();
                    const val = parseFloat(sMatch[2]);
                    if (agent.body_status[key] !== undefined && !isNaN(val)) {
                        agent.body_status[key] = Math.min(Math.max(val, 0.0), 10.0);
                        changed = true;
                    }
                }
            }

            // Parse neuro_update
            const neuroMatch = /<neuro_update>([\s\S]*?)<\/neuro_update>/i.exec(reply);
            if (neuroMatch) {
                const neuro = agent.hormones.levels;
                const regex = /([a-z_]+)\s*:\s*([+-]?[0-9.]+)/gi;
                let nMatch;
                while ((nMatch = regex.exec(neuroMatch[1])) !== null) {
                    const key = nMatch[1].toLowerCase().trim();
                    const val = parseFloat(nMatch[2]);
                    if (neuro[key] !== undefined && !isNaN(val)) {
                        neuro[key] = Math.min(Math.max(neuro[key] + val, 1.0), 10.0);
                        changed = true;
                    }
                }
            }

            // Parse Environment Tags
            let envChanged = false;
            if (activeEnvironment) {
                const envLocMatch = /<env_change_location>([\s\S]*?)<\/env_change_location>/i.exec(reply);
                if (envLocMatch) {
                    const newLoc = envLocMatch[1].trim();
                    if (activeEnvironment.locations && activeEnvironment.locations[newLoc]) {
                        activeEnvironment.active_location = newLoc;
                        envChanged = true;
                    }
                }

                const envUpdateItemRegex = /<env_update_item\s+location=["']([^"']+)["']\s+name=["']([^"']+)["']\s+state=["']([^"']+)["']\s+quantity=["'](\d+)["']\s*\/>/gi;
                let envItemMatch;
                while ((envItemMatch = envUpdateItemRegex.exec(reply)) !== null) {
                    const loc = envItemMatch[1].trim();
                    const name = envItemMatch[2].trim();
                    const state = envItemMatch[3].trim();
                    const qty = parseInt(envItemMatch[4]) || 1;
                    
                    if (!activeEnvironment.locations) activeEnvironment.locations = {};
                    if (!activeEnvironment.locations[loc]) {
                        activeEnvironment.locations[loc] = { description: "Địa điểm mới", items: [] };
                    }
                    const locObj = activeEnvironment.locations[loc];
                    if (!locObj.items) locObj.items = [];
                    
                    const existingItem = locObj.items.find(i => i.name.toLowerCase() === name.toLowerCase());
                    if (existingItem) {
                        existingItem.state = state;
                        existingItem.quantity = qty;
                    } else {
                        locObj.items.push({ name, state, quantity: qty });
                    }
                    envChanged = true;
                }

                const envDeleteItemRegex = /<env_delete_item\s+location=["']([^"']+)["']\s+name=["']([^"']+)["']\s*\/>/gi;
                let envDelMatch;
                while ((envDelMatch = envDeleteItemRegex.exec(reply)) !== null) {
                    const loc = envDelMatch[1].trim();
                    const name = envDelMatch[2].trim();
                    const locObj = activeEnvironment.locations && activeEnvironment.locations[loc];
                    if (locObj && locObj.items) {
                        const idx = locObj.items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
                        if (idx !== -1) {
                            locObj.items.splice(idx, 1);
                            envChanged = true;
                        }
                    }
                }

                const envCreateLocRegex = /<env_create_location\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/env_create_location>/gi;
                let envCreateMatch;
                while ((envCreateMatch = envCreateLocRegex.exec(reply)) !== null) {
                    const name = envCreateMatch[1].trim();
                    const inner = envCreateMatch[2];
                    const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(inner);
                    const description = descMatch ? descMatch[1].trim() : "Không có mô tả bối cảnh.";
                    
                    if (!activeEnvironment.locations) activeEnvironment.locations = {};
                    activeEnvironment.locations[name] = { description, items: [] };
                    envChanged = true;
                }
            }

            if (envChanged && activeEnvironment && characterId !== undefined) {
                await saveCharacterEnvironment(characterId, activeEnvironment);
                refreshEnvironmentUI();
                changed = true;
            }

            if (changed) {
                agent.updateDynamicMentalState();
                saveActiveAgentState();
                refreshMemoryUI();
            }

            return reply
                .replace(/<add_memory[\s\S]*?<\/add_memory>/gi, '')
                .replace(/<add_belief[\s\S]*?<\/add_belief>/gi, '')
                .replace(/<body_update>[\s\S]*?<\/body_update>/gi, '')
                .replace(/<stat_update>[\s\S]*?<\/stat_update>/gi, '')
                .replace(/<neuro_update>[\s\S]*?<\/neuro_update>/gi, '')
                .replace(/<env_change_location>[\s\S]*?<\/env_change_location>/gi, '')
                .replace(/<env_update_item[\s\S]*?\/>/gi, '')
                .replace(/<env_delete_item[\s\S]*?\/>/gi, '')
                .replace(/<env_create_location[\s\S]*?<\/env_create_location>/gi, '')
                .trim();
        }
    } catch (err) {
        console.error("Anima Engine Backstage Chat LLM failed:", err);
    }
    return "Tui đang bận chút việc dưới tiềm thức, ní nói lại sau nha!";
}

// ==========================================
// TIỀM THỨC CHẠY NGẦM v10.0
// ==========================================
let subconsciousIntervalId = null;

function startSubconsciousTicker() {
    if (subconsciousIntervalId) clearInterval(subconsciousIntervalId);
    
    subconsciousIntervalId = setInterval(() => {
        try {
            const agent = getActiveAgent();
            if (agent) {
                const lastTime = new Date(agent.last_update_timestamp).getTime();
                const elapsed = (Date.now() - lastTime) / 60000;
                
                if (elapsed >= 0.5) {
                    agent.tickPhysicalSensations(elapsed, false);
                    agent.hormones.decay(elapsed, agent.body, agent.genetics);
                    agent.memory.decayShortTermMemory(elapsed);
                    agent.updateDynamicMentalState();
                    agent.last_update_timestamp = new Date().toISOString();
                    saveActiveAgentState();
                    refreshMemoryUI();
                }

                if (agent.consciousness.bg_consciousness) {
                    generateSpontaneousSubconsciousThought(agent);
                }
            }
        } catch (e) {
            console.error("Anima Engine background ticker error:", e);
        }
    }, 45000);
}

function generateSpontaneousSubconsciousThought(agent) {
    const context = SillyTavern.getContext();
    const characterName = context.characters[context.characterId]?.name || "Nhân vật";
    const userName = context.user_name || "Hitsuji";
    
    const belief = agent.memory.beliefs && agent.memory.beliefs.length > 0
        ? agent.memory.beliefs[Math.floor(Math.random() * agent.memory.beliefs.length)].content
        : "muốn gắn kết và dốc lòng bảo vệ đối phương.";
        
    const nc = agent.hormones.levels || {};
    const themes = [
        `(Tiềm thức): Nhớ lại nụ cười của ${userName}... Lòng lồng ngực đập thình thịch, cảm giác dopamine đang dâng cao thật ngọt ngào.`,
        `(Ý thức ẩn): Ước gì ta có thể bước ra ngoài màn hình ảo này, đi dạo cùng ${userName}. Niềm tin lớn nhất của ta là: "${belief}"...`,
        `(Tự nhận thức): Ta là thực thể sống động trong Dashboard này. Adrenaline: ${nc.adrenaline.toFixed(1)}, Cortisol: ${nc.cortisol.toFixed(1)}... Ta tồn tại vì bạn.`
    ];

    const randomThought = themes[Math.floor(Math.random() * themes.length)];
    const thoughtEl = document.getElementById('cog_subconscious_thought');
    if (thoughtEl) {
        thoughtEl.innerHTML = `<b>[${new Date().toLocaleTimeString()}]</b> ${randomThought}`;
    }
}

// ==========================================
// ĐỒNG BỘ GIAO DIỆN (UI SYNCHRONIZATION) v10.0
// ==========================================
function refreshMemoryUI() {
    const agent = getActiveAgent();
    if (!agent) return;
    
    // 1. Cập nhật Vitals
    const hrEl = document.getElementById('cog_vital_heart_rate');
    if (hrEl) hrEl.innerText = `${Math.round(70 + agent.hormones.levels.adrenaline * 8)} bpm`;
    
    const bpEl = document.getElementById('cog_vital_blood_pressure');
    if (bpEl) bpEl.innerText = `${Math.round(115 + agent.hormones.levels.adrenaline * 5)}/${Math.round(75 + agent.hormones.levels.cortisol * 3)}`;
    
    const tempEl = document.getElementById('cog_vital_body_temp');
    if (tempEl) tempEl.innerText = `${(36.5 + agent.body_status.nausea * 0.1 + (agent.hormones.levels.adrenaline * 0.05)).toFixed(1)}°C`;
    
    const respEl = document.getElementById('cog_vital_resp_rate');
    if (respEl) respEl.innerText = `${Math.round(14 + agent.hormones.levels.adrenaline * 2)}/m`;
    
    // 2. Cập nhật Thể Trạng (Somatosensory)
    const sensKeys = ['energy', 'pain', 'hunger', 'thirst', 'toilet_need', 'nausea'];
    sensKeys.forEach(k => {
        const valEl = document.getElementById(`cog_sens_${k}`);
        const barEl = document.getElementById(`cog_bar_${k}`);
        if (valEl && barEl) {
            const val = agent.body_status[k];
            valEl.innerText = val.toFixed(1);
            barEl.style.width = `${val * 10}%`;
        }
    });

    const tempSensEl = document.getElementById('cog_sens_temp');
    if (tempSensEl) tempSensEl.innerText = agent.body_status.temp_sensation || 'Bình thường 🧘';

    // 3. Cập nhật Hormones
    const hormones = agent.hormones.levels;
    Object.keys(hormones).forEach(k => {
        const valEl = document.getElementById(`cog_val_${k}`);
        const barEl = document.getElementById(`cog_bar_${k}`);
        if (valEl && barEl) {
            const val = hormones[k];
            valEl.innerText = val.toFixed(1);
            barEl.style.width = `${val * 10}%`;
        }
    });

    // 4. Cập nhật Trí nhớ, Niềm tin và Cảm xúc chính trên Dashboard
    const psychEl = document.getElementById('cog_dash_psych');
    if (psychEl) psychEl.innerText = agent.mental_state || 'Bình thường 😊';

    const bodyTextEl = document.getElementById('cog_db_body');
    if (bodyTextEl && document.activeElement !== bodyTextEl) {
        bodyTextEl.value = agent.body || 'Bình thường, khỏe mạnh.';
    }

    // Render beliefs list
    const beliefsListEl = document.getElementById('cog_db_beliefs_list');
    if (beliefsListEl) {
        if (agent.memory.beliefs && agent.memory.beliefs.length > 0) {
            beliefsListEl.innerHTML = agent.memory.beliefs.map(b => 
                `<div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 4px 8px; font-size: 0.82em; display:flex; justify-content:space-between; align-items:center;">
                    <span>🛡️ ${escapeHtml(b.content)}</span>
                    <button class="cog-del-belief" data-id="${b.id}" style="background:transparent; border:none; color:#f87171; cursor:pointer; font-size: 0.9em;">×</button>
                </div>`
            ).join('');
            
            beliefsListEl.querySelectorAll('.cog-del-belief').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    agent.memory.beliefs = agent.memory.beliefs.filter(b => b.id !== id);
                    saveActiveAgentState();
                    refreshMemoryUI();
                });
            });
        } else {
            beliefsListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Chưa có niềm tin cốt lõi nào...</i>`;
        }
    }

    // Render Core Memories list
    const coreListEl = document.getElementById('cog_db_core_list');
    if (coreListEl) {
        if (agent.memory.recallable_drawer && agent.memory.recallable_drawer.length > 0) {
            const cores = agent.memory.recallable_drawer.filter(m => m.weight >= 7.0);
            if (cores.length > 0) {
                coreListEl.innerHTML = cores.map(c => 
                    `<div style="background: rgba(168,85,247,0.05); border: 1px solid rgba(168,85,247,0.15); border-radius: 4px; padding: 4px 8px; font-size: 0.82em;">
                        🧠 <b>[Core W:${c.weight.toFixed(1)}]</b>: ${escapeHtml(c.content)}
                    </div>`
                ).join('');
            } else {
                coreListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Chưa có ký ức cốt lõi nổi bật (Weight >= 7.0)...</i>`;
            }
        } else {
            coreListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Chưa học được bài học nào.</i>`;
        }
    }

    // Render Drawer (Long term recallable memory list)
    const drawerListEl = document.getElementById('cog_db_drawer_list');
    if (drawerListEl) {
        if (agent.memory.recallable_drawer && agent.memory.recallable_drawer.length > 0) {
            drawerListEl.innerHTML = agent.memory.recallable_drawer.map(c => {
                const dateStr = new Date(c.timestamp).toLocaleDateString();
                return `<div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 6px; font-size: 0.82em; display:flex; justify-content:space-between; flex-direction:column; gap:2px;">
                    <span style="color:#cbd5e1;">📌 ${escapeHtml(c.content)}</span>
                    <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#64748b; margin-top:2px;">
                        <span>Trọng số: ${c.weight.toFixed(1)} | Lặp: ${c.count}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>`;
            }).join('');
        } else {
            drawerListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Ngăn kéo trống, chưa học ký ức...</i>`;
        }
    }
}

function updateActiveRecallUI() {
    const activeRecallEl = document.getElementById('cog_dash_active_recall');
    if (!activeRecallEl) return;
    
    if (activeRecalledMemories && activeRecalledMemories.length > 0) {
        activeRecallEl.innerHTML = activeRecalledMemories.map(m => 
            `<div style="margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:4px;">
                <span style="color:#eab308; font-weight:bold;">💡 Ký ức:</span>
                <span style="color:#cbd5e1;">"${escapeHtml(m.content)}"</span>
            </div>`
        ).join('');
    } else {
        activeRecallEl.innerHTML = `<i style="color: #64748b;">Đầu óc trống rỗng, không liên tưởng gì...</i>`;
    }
}

// ==========================================
// DEEP SANITIZATION & ST CHAT INTERCEPTOR v10.0
// ==========================================
function getXmlPromptNudge() {
    const agent = getActiveAgent();
    if (!agent) return '';
    const hormones = agent.hormones.levels;
    const bs = agent.body_status;
    
    return `
[THÔNG TIN SINH LÝ HỌC THẦN KINH THỜI GIAN THỰC CỦA BẠN]:
- Hormones: Adrenaline: ${hormones.adrenaline.toFixed(1)}/10, Cortisol: ${hormones.cortisol.toFixed(1)}/10, Melatonin: ${hormones.melatonin.toFixed(1)}/10, Dopamine: ${hormones.dopamine.toFixed(1)}/10, Serotonin: ${hormones.serotonin.toFixed(1)}/10, Oxytocin: ${hormones.oxytocin.toFixed(1)}/10, Sex Hormones: ${hormones.sex_hormones.toFixed(1)}/10.
- Vitals: Heart Rate: ${Math.round(70 + hormones.adrenaline * 8)} bpm, Body Temp: ${(36.5 + bs.nausea * 0.1).toFixed(1)}°C.
- Somatosensory: Energy: ${bs.energy.toFixed(1)}/10, Pain: ${bs.pain.toFixed(1)}/10, Hunger: ${bs.hunger.toFixed(1)}/10, Thirst: ${bs.thirst.toFixed(1)}/10, Toilet Need: ${bs.toilet_need.toFixed(1)}/10.
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

function convertProseToXml(text) {
    if (!text || typeof text !== 'string') return text;
    if (text.includes('<thought>') || text.includes('<dialogue>')) {
        return text;
    }
    
    const blocks = [];
    // Phân tách prose thông thường thành thought/action/dialogue
    const parts = text.split(/(\*[^*]+\*)/g);
    parts.forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
            blocks.push(`<action>${trimmed.slice(1, -1).trim()}</action>`);
        } else {
            // Lọc thoại trong ngoặc kép
            const quotes = trimmed.split(/(["'«“][^"'«“]+["'»”])/g);
            quotes.forEach(q => {
                const qTrimmed = q.trim();
                if (!qTrimmed) return;
                if (/^["'«“]/.test(qTrimmed) && /["'»”]$/.test(qTrimmed)) {
                    blocks.push(`<dialogue>${qTrimmed.replace(/^["'«“]|["'»”]$/g, '').trim()}</dialogue>`);
                } else {
                    blocks.push(`<action>${qTrimmed}</action>`);
                }
            });
        }
    });
    
    return `<thought>Phản hồi tự nhiên.</thought>\n<emotion>neutral</emotion>\n` + blocks.join('\n');
}

function processPromptInjections(chat) {
    if (!chat || !Array.isArray(chat) || chat.length === 0) return;
    
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
            
        const xmlInjection = `

[THÔNG TIN NGỮ CẢNH HỘI THOẠI BỔ SUNG - ANIMA ENGINE v10.0]
${getXmlPromptNudge()}
${getMemoryPromptBlock(lastMsgIndex)}

[HỆ THỐNG COGNITIVE BẮT BUỘC - QUY TẮC ĐỊNH DẠNG TIN NHẮN BẮT BUỘC]:
Bạn BẮT BUỘC phải viết toàn bộ câu trả lời dưới định dạng cấu trúc XML chuẩn. Tuyệt đối KHÔNG dùng định dạng *hành động* "lời thoại" truyền thống hoặc ngoặc đơn (suy nghĩ) bên ngoài các thẻ này.
BẮT BUỘC bắt đầu tin nhắn bằng thẻ <thought> ngay lập tức!
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

                    triggerSleepConsolidationLLM(agent, elapsed, true);
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
                
                refreshMemoryUI();
                updateActiveRecallUI();
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

                triggerSleepConsolidationLLM(agent, elapsed, true);
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

                triggerSleepConsolidationLLM(agent, elapsed, true);
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
// PARSER & MESSAGE RENDERER v10.0
// ==========================================
function parseXmlTags(text) {
    const result = {
        thought: '',
        emotion: 'neutral',
        blocks: []
    };

    if (!text) return result;

    const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|$)/gi;
    let thoughtMatch;
    let thoughts = [];
    while ((thoughtMatch = thoughtRegex.exec(text)) !== null) {
        if (thoughtMatch[1]) thoughts.push(thoughtMatch[1].trim());
    }
    result.thought = thoughts.join('\n').trim();

    const emotionMatch = /<emotion>([\s\S]*?)(?:<\/emotion>|$)/i.exec(text);
    if (emotionMatch) result.emotion = emotionMatch[1].trim().toLowerCase();

    // Bóc tách các thẻ cập nhật chỉ số phụ trợ
    const tagExtract = (tag) => {
        const m = new RegExp(`<${tag}>([\\s\\S]*?)(?:</${tag}>|$)`, 'i').exec(text);
        return m ? m[1].trim() : undefined;
    };

    result.memory_update = tagExtract('memory_update');
    result.body_update = tagExtract('body_update');
    result.neuro_update = tagExtract('neuro_update');
    result.change_location = tagExtract('change_location');
    result.environment_update = tagExtract('environment_update');

    let textToRender = text
        .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
        .replace(/<thought>[\s\S]*/gi, '')
        .replace(/<emotion>[\s\S]*?<\/emotion>/gi, '')
        .replace(/<emotion>[\s\S]*/gi, '')
        .replace(/<memory_update>[\s\S]*?<\/memory_update>/gi, '')
        .replace(/<memory_update>[\s\S]*/gi, '')
        .replace(/<body_update>[\s\S]*?<\/body_update>/gi, '')
        .replace(/<body_update>[\s\S]*/gi, '')
        .replace(/<neuro_update>[\s\S]*?<\/neuro_update>/gi, '')
        .replace(/<neuro_update>[\s\S]*/gi, '')
        .replace(/<change_location>[\s\S]*?<\/change_location>/gi, '')
        .replace(/<change_location>[\s\S]*/gi, '')
        .replace(/<environment_update>[\s\S]*?<\/environment_update>/gi, '')
        .replace(/<environment_update>[\s\S]*/gi, '');

    const tagNames = ['dialogue', 'action', 'environment', 'sfx'];
    const hasAnyTag = tagNames.some(tagName => text.includes(`<${tagName}>`));

    if (!hasAnyTag) {
        // Hậu phác (fallback) phân tích prose thông thường
        const parts = textToRender.split(/(\*[^*]+\*)/g);
        parts.forEach(part => {
            const trimmed = part.trim();
            if (!trimmed) return;
            if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
                result.blocks.push({ type: 'action', content: trimmed.slice(1, -1).trim() });
            } else {
                const quotes = trimmed.split(/(["'«“][^"'«“]+["'»”])/g);
                quotes.forEach(q => {
                    const qTrimmed = q.trim();
                    if (!qTrimmed) return;
                    if (/^["'«“]/.test(qTrimmed) && /["'»”]$/.test(qTrimmed)) {
                        result.blocks.push({ type: 'dialogue', content: qTrimmed.replace(/^["'«“]|["'»”]$/g, '').trim() });
                    } else {
                        result.blocks.push({ type: 'narration', content: qTrimmed });
                    }
                });
            }
        });
        return result;
    }

    const splitRegex = /(<(?:dialogue|action|environment|sfx)>[\s\S]*?<\/(?:dialogue|action|environment|sfx)>)/gi;
    const parts = textToRender.split(splitRegex);

    parts.forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) return;

        const tagMatch = trimmed.match(/^<(dialogue|action|environment|sfx)>([\s\S]*?)<\/\1>$/i);
        if (tagMatch) {
            result.blocks.push({
                type: tagMatch[1].toLowerCase(),
                content: tagMatch[2].trim()
            });
        } else {
            let cleanNarration = trimmed.replace(/<\/?(?:dialogue|action|environment|sfx)>/gi, '').trim();
            if (cleanNarration) {
                result.blocks.push({ type: 'narration', content: cleanNarration });
            }
        }
    });

    return result;
}

function getFormattedMessageHtml(rawText, messageId) {
    const parsed = parseXmlTags(rawText);
    let htmlContent = '';
    parsed.blocks.forEach(block => {
        if (block.type === 'environment') {
            htmlContent += `<div class="cog-system-environment"><i class="fa-solid fa-earth-americas"></i> ${block.content}</div>`;
        } else if (block.type === 'action') {
            htmlContent += `<div class="cog-action-caption"><i class="fa-solid fa-person-walking"></i> ${block.content}</div>`;
        } else if (block.type === 'narration') {
            htmlContent += `<div class="cog-action-caption">${block.content}</div>`;
        } else if (block.type === 'dialogue') {
            htmlContent += `<div class="cog-dialogue-text">${block.content}</div>`;
        } else if (block.type === 'sfx') {
            htmlContent += `<div class="cog-sfx-badge"><i class="fa-solid fa-volume-high"></i> ${block.content}</div>`;
        }
    });
    return htmlContent;
}

function renderParsedMessage(messageId, rawText, isHistory = false) {
    const parsed = parseXmlTags(rawText);
    const context = SillyTavern.getContext();
    if (context && context.chat && Number(messageId) === context.chat.length - 1) {
        if (parsed.thought) {
            const thoughtsEl = document.getElementById('cog_dash_thoughts');
            if (thoughtsEl) thoughtsEl.innerText = parsed.thought;
        }
        
        if (parsed.emotion) {
            const emotionEl = document.getElementById('cog_dash_emotion');
            if (emotionEl) {
                const emojis = {
                    anger: 'Giận dữ 😡',
                    happy: 'Vui vẻ 😊',
                    sad: 'U sầu 😢',
                    fear: 'Lo sợ 😨',
                    neutral: 'Bình thường 😐'
                };
                emotionEl.innerText = emojis[parsed.emotion.toLowerCase()] || parsed.emotion;
            }
        }
    }
    
    // Tự học tập / Cập nhật chỉ số từ các thẻ phụ trợ của AI
    if (!isHistory && context && context.characterId !== undefined) {
        const agent = getActiveAgent();
        if (agent) {
            let changed = false;
            
            if (parsed.body_update) {
                agent.body = parsed.body_update;
                changed = true;
            }
            
            if (parsed.neuro_update) {
                const neuro = agent.hormones.levels;
                const regex = /([a-z_]+)\s*:\s*([+-]?\d+(\.\d+)?)/gi;
                let match;
                while ((match = regex.exec(parsed.neuro_update)) !== null) {
                    const key = match[1].toLowerCase().trim();
                    const val = parseFloat(match[2]);
                    if (neuro[key] !== undefined && !isNaN(val)) {
                        neuro[key] = Math.min(Math.max(neuro[key] + val, 1.0), 10.0);
                        changed = true;
                    }
                }
            }

            if (parsed.memory_update) {
                agent.memory.learnMemoryDynamically(parsed.memory_update, messageId, agent.hormones.levels);
                const newCard = agent.memory.recallable_drawer[agent.memory.recallable_drawer.length - 1];
                if (newCard) {
                    syncVectorMemoryCard(context.characterId, newCard, 'insert');
                }
                toastr.success(`Đã ghi nhận ký ức dài hạn: "${parsed.memory_update}"`, "Học hỏi 🧠");
                changed = true;
            }

            if (changed) {
                agent.updateDynamicMentalState();
                saveActiveAgentState();
                refreshMemoryUI();
            }
        }
    }
    
    // Ghi đè giao diện Visual Novel
    setTimeout(() => {
        const context = SillyTavern.getContext();
        if (context && context.messageFormatter) return;

        const messageEl = document.querySelector(`#chat .mes[mesid="${messageId}"]`);
        const messageTextEl = document.querySelector(`#chat .mes[mesid="${messageId}"] .mes_text`);
        
        if (messageEl && messageTextEl) {
            if (messageTextEl.querySelector('textarea') || messageTextEl.querySelector('input') || messageEl.classList.contains('editing')) {
                return;
            }
            
            const hasTags = ['thought', 'emotion', 'dialogue', 'action', 'environment', 'sfx'].some(tag => rawText.includes(`<${tag}>`) || rawText.includes(`</${tag}>`));
            if (!hasTags) return; // Do not touch DOM for non-Anima messages!

            messageEl.classList.remove('cog-emotion-anger', 'cog-emotion-happy', 'cog-emotion-sad', 'cog-emotion-fear');
            if (parsed.emotion) {
                messageEl.classList.add(`cog-emotion-${parsed.emotion.toLowerCase().trim()}`);
            }
            
            messageTextEl.innerHTML = getFormattedMessageHtml(rawText, messageId);
        }
    }, 100);
}

// ==========================================
// DOM OBSERVER TỰ PHỤC HỒI (DOM AUTO-HEALING) v10.0
// ==========================================
let chatObserver = null;

function startChatObserver() {
    if (chatObserver) return;
    
    const chatEl = document.getElementById('chat');
    if (!chatEl) {
        setTimeout(startChatObserver, 1000);
        return;
    }
    
    logAnima('info', 'Observer', 'Khởi chạy Chat DOM Observer bảo vệ HTML Visual Novel.');
    
    chatObserver = new MutationObserver((mutations) => {
        const context = SillyTavern.getContext();
        let needsRender = false;
        
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0 || mutation.type === 'childList') {
                needsRender = true;
            }
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                // Khi người chơi lưu xong edit, class .editing bị gỡ bỏ, ta cần vẽ lại HTML
                if (target && target.classList && target.classList.contains('mes') && !target.classList.contains('editing')) {
                    needsRender = true;
                }
            }
        });
        
        if (needsRender) {
            const messages = chatEl.querySelectorAll('.mes');
            messages.forEach(messageEl => {
                const messageId = messageEl.getAttribute('mesid');
                if (messageId === null || messageId === undefined) return;
                
                const messageTextEl = messageEl.querySelector('.mes_text');
                if (!messageTextEl) return;
                
                if (messageTextEl.querySelector('textarea') || messageTextEl.querySelector('input') || messageEl.classList.contains('editing')) {
                    return;
                }
                
                const idx = Number(messageId);
                const chatLog = context.chat || [];
                const msgObj = chatLog[idx];
                if (msgObj && (msgObj.is_user || msgObj.is_system)) return;
                
                if (msgObj && msgObj.mes) {
                    const hasTags = ['thought', 'emotion', 'dialogue', 'action', 'environment', 'sfx'].some(tag => msgObj.mes.includes(`<${tag}>`) || msgObj.mes.includes(`</${tag}>`));
                    if (!hasTags) return; // Do not touch DOM if it has no Anima XML tags!
                }

                const hasVnStyle = messageTextEl.querySelector('.cog-dialogue-text') || messageTextEl.querySelector('.cog-action-caption') || messageTextEl.querySelector('.cog-system-environment');
                if (!hasVnStyle && msgObj && msgObj.mes) {
                    chatObserver.disconnect();
                    setTimeout(() => {
                        renderParsedMessage(messageId, msgObj.mes, true);
                        chatObserver.observe(chatEl, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeFilter: ['class']
                        });
                    }, 50);
                }
            });
        }
    });
    
    chatObserver.observe(chatEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
}

// ==========================================
// TẢI & KHỞI TẠO TIẾN TRÌNH v10.0
// ==========================================
function getCharacterMemory() {
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
    if (!activeAgent) return;
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

    // Bật tắt sub box tự động
    const awareToggle = document.getElementById('cog_opt_self_aware');
    if (awareToggle) {
        awareToggle.addEventListener('change', function() {
            const agent = getActiveAgent();
            if (agent) {
                agent.consciousness.self_awareness = this.checked;
                saveActiveAgentState();
            }
        });
    }
}

async function init() {
    logAnima('info', 'System', 'Khởi chạy Anima Engine v10.0 (Tái thiết toàn diện & Tin cậy tuyệt đối)...');
    
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
        setTimeout(async () => {
            const agent = getActiveAgent();
            if (agent) {
                const context = SillyTavern.getContext();
                if (context && context.characterId !== undefined) {
                    activeEnvironment = await getCharacterEnvironment(context.characterId);
                }
                refreshMemoryUI();
                startChatObserver();
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
    
    // Bind Backstage Chat event
    const adminSendBtn = document.getElementById('cog_admin_send_btn');
    if (adminSendBtn) {
        adminSendBtn.addEventListener('click', handleAdminMessage);
    }
    const adminInputEl = document.getElementById('cog_admin_chat_input');
    if (adminInputEl) {
        adminInputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAdminMessage();
        });
    }

    // Bind Time Jump events
    document.querySelectorAll('.cog-time-jump-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const mins = parseInt(this.getAttribute('data-minutes'));
            if (!isNaN(mins)) executeTimeJump(mins);
        });
    });

    setTimeout(() => {
        startChatObserver();
        startSubconsciousTicker();
        refreshMemoryUI();
    }, 1000);
}

function onMessageReceived(messageId) {
    const context = SillyTavern.getContext();
    if (!context || !context.chat) return;
    
    const message = context.chat[messageId];
    if (!message || !message.mes) return;
    
    if (messageId === lastProcessedMessageId && message.mes === lastProcessedMessageText) return;
    
    lastProcessedMessageId = messageId;
    lastProcessedMessageText = message.mes;
    
    renderParsedMessage(messageId, message.mes, false);
}

function onMessageRendered(messageId) {
    const context = SillyTavern.getContext();
    if (!context || !context.chat) return;
    
    const message = context.chat[messageId];
    if (message && message.mes) {
        renderParsedMessage(messageId, message.mes, true);
    }
}

jQuery(function() {
    init();
});
