// v0.11.0
import { saveCharacterEnvironment } from '../services/EnvironmentService.js';
import { syncVectorMemoryCard } from '../services/VectorMemoryService.js';
import { refreshEnvironmentUI, escapeHtml } from '../ui/DashboardUI.js';
import { logAnima } from '../utils/logger.js';
import { ADMIN_RATELIMIT_MS, THRESHOLDS } from '../utils/constants.js';

// Bug 9: rate limit tracking
let lastAdminCallAt = 0;

function generateId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return prefix + crypto.randomUUID();
    }
    return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

export async function handleAdminMessage(agent, activeEnvironment, callbacks = {}) {
    const inputEl = document.getElementById('cog_admin_chat_input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;

    // Bug 9: rate limit guard
    const now = Date.now();
    if (now - lastAdminCallAt < ADMIN_RATELIMIT_MS) {
        const wait = Math.ceil((ADMIN_RATELIMIT_MS - (now - lastAdminCallAt)) / 1000);
        appendAdminChatLog(
            'admin',
            `Ní gửi nhanh quá, tui cần ${wait}s để xử lý. Đợi chút nha!`
        );
        return;
    }
    lastAdminCallAt = now;

    inputEl.value = '';
    appendAdminChatLog('user', text);

    try {
        const response = await processAdminCommand(text, agent, activeEnvironment, callbacks);
        appendAdminChatLog('admin', response);
    } catch (err) {
        logAnima('error', 'Backstage', `Admin command failed: ${err.message}`);
        appendAdminChatLog('admin', 'Đã xảy ra lỗi hệ thống khi xử lý mệnh lệnh của bạn.');
    }
}

export function appendAdminChatLog(sender, text) {
    const chatLogEl = document.getElementById('cog_admin_chat_log');
    if (!chatLogEl) return;

    const bubble = document.createElement('div');
    bubble.style.marginBottom = '6px';
    if (sender === 'user') {
        bubble.style.color = '#cbd5e1';
        bubble.innerHTML = `<b>[Hitsuji]</b>: ${escapeHtml(text)}`;
    } else {
        bubble.style.color = '#38bdf8';
        bubble.innerHTML = `<b>[Admin Agent]</b>: ${escapeHtml(text)}`;
    }
    chatLogEl.appendChild(bubble);
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

const BACKSTAGE_PARSERS = [
    {
        match: (text) => /chữa vết thương|hồi phục|hồi máu|chữa lành/i.test(text),
        apply: (agent) => {
            agent.body = 'Bình thường, khỏe mạnh. Cơ thể đã được khôi phục hoàn toàn.';
            agent.body_status.pain = 0.0;
            agent.body_status.energy = 10.0;
            agent.body_status.nausea = 0.0;
            agent.body_status.hunger = 0.0;
            agent.body_status.thirst = 0.0;
            agent.body_status.toilet_need = 0.0;
            agent.body_status.dyspnea = 0.0;
            agent.body_status.temp_sensation = 'Bình thường';
            agent.updateDynamicMentalState();
            return 'Hệ thống Somatosensory đã được phục hồi tối ưu: vết thương lành lặn, đau đớn biến mất hoàn toàn (0.0) và năng lượng đầy tràn (10.0)!';
        },
    },
];

function applyChangeLocation(match, env) {
    const newLoc = match[1].trim();
    if (env.locations && env.locations[newLoc]) {
        env.active_location = newLoc;
        return true;
    }
    return false;
}

function applyUpdateItem(match, env) {
    const loc = match[1].trim();
    const name = match[2].trim();
    const state = match[3].trim();
    const qty = parseInt(match[4]) || 1;

    if (!env.locations) env.locations = {};
    if (!env.locations[loc]) {
        env.locations[loc] = { description: 'Địa điểm mới', items: [] };
    }
    const locObj = env.locations[loc];
    if (!locObj.items) locObj.items = [];

    const existingItem = locObj.items.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existingItem) {
        existingItem.state = state;
        existingItem.quantity = qty;
    } else {
        locObj.items.push({ name, state, quantity: qty });
    }
    return true;
}

function applyDeleteItem(match, env) {
    const loc = match[1].trim();
    const name = match[2].trim();
    const locObj = env.locations && env.locations[loc];
    if (locObj && locObj.items) {
        const idx = locObj.items.findIndex((i) => i.name.toLowerCase() === name.toLowerCase());
        if (idx !== -1) {
            locObj.items.splice(idx, 1);
            return true;
        }
    }
    return false;
}

function applyCreateLocation(match, env) {
    const name = match[1].trim();
    const inner = match[2];
    const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(inner);
    const description = descMatch ? descMatch[1].trim() : 'Không có mô tả bối cảnh.';

    if (!env.locations) env.locations = {};
    env.locations[name] = { description, items: [] };
    return true;
}

const TAG_PARSERS = {
    add_memory: {
        regex: /<add_memory(?:\s+emotion=["'](\w+)["'])?\s*>([\s\S]*?)<\/add_memory>/gi,
        apply: async (match, agent, env, characterId) => {
            const content = match[2].trim();
            if (content.length > THRESHOLDS.MEMORY_MIN_CHARS) {
                const newCard = {
                    id: generateId('mem_'),
                    content: content,
                    timestamp: new Date().toISOString(),
                    weight: 6.0,
                    count: 1,
                    emotions: { joy: 5, sadness: 1, fear: 1, anger: 1, nostalgia: 5 },
                };
                agent.memory.recallable_drawer.push(newCard);
                await syncVectorMemoryCard(characterId, newCard, 'insert');
                return true;
            }
            return false;
        },
    },
    add_belief: {
        regex: /<add_belief>([\s\S]*?)<\/add_belief>/gi,
        apply: async (match, agent) => {
            agent.memory.beliefs.push({
                id: generateId('belief_'),
                content: match[1].trim(),
                timestamp: new Date().toISOString(),
            });
            return true;
        },
    },
    body_update: {
        regex: /<body_update>([\s\S]*?)<\/body_update>/gi,
        apply: async (match, agent) => {
            agent.body = match[1].trim();
            return true;
        },
    },
    stat_update: {
        regex: /<stat_update>([\s\S]*?)<\/stat_update>/gi,
        apply: async (match, agent) => {
            const regex = /([a-z_]+)\s*:\s*([0-9.]+)/gi;
            let sMatch;
            let changed = false;
            while ((sMatch = regex.exec(match[1])) !== null) {
                const key = sMatch[1].toLowerCase().trim();
                const val = parseFloat(sMatch[2]);
                if (agent.body_status[key] !== undefined && !isNaN(val)) {
                    agent.body_status[key] = Math.max(0.0, Math.min(10.0, val));
                    changed = true;
                }
            }
            return changed;
        },
    },
    neuro_update: {
        regex: /<neuro_update>([\s\S]*?)<\/neuro_update>/gi,
        apply: async (match, agent) => {
            const neuro = agent.hormones.levels;
            const regex = /([a-z_]+)\s*:\s*([+-]?[0-9.]+)/gi;
            let nMatch;
            let changed = false;
            while ((nMatch = regex.exec(match[1])) !== null) {
                const key = nMatch[1].toLowerCase().trim();
                const val = parseFloat(nMatch[2]);
                if (neuro[key] !== undefined && !isNaN(val)) {
                    neuro[key] = Math.max(0.0, Math.min(10.0, neuro[key] + val));
                    changed = true;
                }
            }
            return changed;
        },
    },
    env_change_location: {
        regex: /<env_change_location>([\s\S]*?)<\/env_change_location>/gi,
        apply: async (match, agent, env) => applyChangeLocation(match, env),
    },
    env_update_item: {
        regex: /<env_update_item\s+location=["']([^"']+)["']\s+name=["']([^"']+)["']\s+state=["']([^"']+)["']\s+quantity=["'](\d+)["']\s*\/>/gi,
        apply: async (match, agent, env) => applyUpdateItem(match, env),
    },
    env_delete_item: {
        regex: /<env_delete_item\s+location=["']([^"']+)["']\s+name=["']([^"']+)["']\s*\/>/gi,
        apply: async (match, agent, env) => applyDeleteItem(match, env),
    },
    env_create_location: {
        regex: /<env_create_location\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/env_create_location>/gi,
        apply: async (match, agent, env) => applyCreateLocation(match, env),
    },
    change_location: {
        regex: /<change_location>([\s\S]*?)<\/change_location>/gi,
        apply: async (match, agent, env) => applyChangeLocation(match, env),
    },
    update_item: {
        regex: /<update_item\s+location=["']([^"']+)["']\s+name=["']([^"']+)["']\s+state=["']([^"']+)["']\s+quantity=["'](\d+)["']\s*\/>/gi,
        apply: async (match, agent, env) => applyUpdateItem(match, env),
    },
    delete_item: {
        regex: /<delete_item\s+location=["']([^"']+)["']\s+name=["']([^"']+)["']\s*\/>/gi,
        apply: async (match, agent, env) => applyDeleteItem(match, env),
    },
    create_location: {
        regex: /<create_location\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/create_location>/gi,
        apply: async (match, agent, env) => applyCreateLocation(match, env),
    },
};

const KNOWN_XML_TAGS = new Set([
    'add_memory',
    'add_belief',
    'body_update',
    'stat_update',
    'neuro_update',
    'env_change_location',
    'env_update_item',
    'env_delete_item',
    'env_create_location',
    'change_location',
    'update_item',
    'delete_item',
    'create_location',
    'description',
]);

function stripAllTags(text) {
    if (!text) return '';
    return text
        .replace(/<add_memory[\s\S]*?<\/add_memory>/gi, '')
        .replace(/<add_belief[\s\S]*?<\/add_belief>/gi, '')
        .replace(/<body_update>[\s\S]*?<\/body_update>/gi, '')
        .replace(/<stat_update>[\s\S]*?<\/stat_update>/gi, '')
        .replace(/<neuro_update>[\s\S]*?<\/neuro_update>/gi, '')
        .replace(/<(?:env_)?change_location>[\s\S]*?<\/(?:env_)?change_location>/gi, '')
        .replace(/<(?:env_)?update_item[\s\S]*?\/>/gi, '')
        .replace(/<(?:env_)?delete_item[\s\S]*?\/>/gi, '')
        .replace(/<(?:env_)?create_location[\s\S]*?<\/(?:env_)?create_location>/gi, '')
        .trim();
}

export async function processAdminCommand(text, agent, activeEnvironment, callbacks = {}) {
    if (!agent || typeof SillyTavern === 'undefined') return 'Không tìm thấy bộ não nhân vật đang hoạt động.';

    const context = SillyTavern.getContext();
    const characterId = context.characterId;
    const characterName = context.characters[characterId]?.name || 'Nhân vật';

    // 1. Check local commands (BACKSTAGE_PARSERS)
    for (const parser of BACKSTAGE_PARSERS) {
        if (parser.match(text)) {
            const response = parser.apply(agent);
            if (callbacks.saveState) callbacks.saveState();
            if (callbacks.refreshUI) callbacks.refreshUI();
            return response;
        }
    }

    // Lấy thông tin bối cảnh môi trường
    let envSummary = '(Không có bối cảnh môi trường nào được ghi nhận)';
    if (activeEnvironment && activeEnvironment.active_location) {
        const activeLoc = activeEnvironment.active_location;
        const locData = activeEnvironment.locations && activeEnvironment.locations[activeLoc];
        if (locData) {
            const itemsList = (locData.items || [])
                .map(
                    (item) =>
                        `* ${item.name} | Trạng thái: ${item.state || 'Bình thường'} | Số lượng: ${item.quantity || 1}`
                )
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
- Di chuyển địa điểm hiện tại (nếu địa điểm đó đã tồn tại): <change_location>tên_địa_điểm</change_location>
- Cập nhật hoặc Thêm vật phẩm ở địa điểm: <update_item location="tên địa điểm" name="Tên vật phẩm" state="Trạng thái" quantity="1"/>
- Xóa một vật phẩm ở địa điểm: <delete_item location="tên địa điểm" name="Tên vật phẩm"/>
- Tạo địa điểm mới hoặc cập nhật mô tả chi tiết địa điểm hiện tại: <create_location name="Tên địa điểm"><description>Mô tả chi tiết địa điểm sinh động</description></create_location>

Hãy trả lời Hitsuji thật chi tiết và chèn các thẻ thực thi thích hợp:`;

    try {
        const reply = await context.generateQuietPrompt({ quietPrompt: prompt, responseLength: 1000 });
        if (reply && reply.trim()) {
            let changed = false;
            let envChanged = false;

            // Whitelist check: warn about any XML tags not in the known set
            const allTagsInReply = reply.match(/<\/?([a-z_][a-z0-9_]*)/gi) || [];
            for (const rawTag of allTagsInReply) {
                const tagName = rawTag.replace(/^<\/?/, '').toLowerCase();
                if (!KNOWN_XML_TAGS.has(tagName)) {
                    console.warn(`[BackstageConsole] Unknown XML tag ignored: <${tagName}>`);
                }
            }

            // Execute tag parsers
            for (const [tagName, parser] of Object.entries(TAG_PARSERS)) {
                parser.regex.lastIndex = 0;
                let m;
                while ((m = parser.regex.exec(reply)) !== null) {
                    const result = await parser.apply(m, agent, activeEnvironment, characterId);
                    if (result) {
                        changed = true;
                        if (
                            tagName.startsWith('env_') ||
                            ['change_location', 'update_item', 'delete_item', 'create_location'].includes(tagName)
                        ) {
                            envChanged = true;
                        }
                    }
                }
            }

            if (envChanged && activeEnvironment && characterId !== undefined) {
                await saveCharacterEnvironment(characterId, activeEnvironment);
                refreshEnvironmentUI(activeEnvironment);
            }

            if (changed) {
                agent.updateDynamicMentalState();
                if (callbacks.saveState) callbacks.saveState();
                if (callbacks.refreshUI) callbacks.refreshUI();
            }

            return stripAllTags(reply).trim();
        }
    } catch (err) {
        logAnima('error', 'Backstage', `Backstage LLM failed: ${err.message}`);
        return 'LLM xử lý thất bại. Tui bận chút việc dưới tiềm thức, ní nói lại sau nha!';
    }
    return 'Tui nghe rồi mà chưa nghĩ ra gì để phản hồi. Ní thử diễn đạt khác xem!';
}
