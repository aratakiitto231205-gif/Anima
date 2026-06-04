/**
 * BackstageConsole.js - v10.0 (Backstage Console & AD Agent Service)
 * 
 * Quản lý hội thoại tiềm thức với AD Agent (AI Quản trị sau cánh gà),
 * biên dịch mệnh lệnh ngôn ngữ tự nhiên thành các thẻ XML thay đổi chỉ số sinh hóa,
 * cảm giác somatosensory, và môi trường vật lý cố định.
 */

import { saveCharacterEnvironment } from '../services/EnvironmentService.js';
import { syncVectorMemoryCard } from '../services/VectorMemoryService.js';
import { refreshEnvironmentUI, escapeHtml } from '../ui/DashboardUI.js';

export async function handleAdminMessage(agent, activeEnvironment, callbacks = {}) {
    const inputEl = document.getElementById('cog_admin_chat_input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;
    
    inputEl.value = '';
    appendAdminChatLog('user', text);
    
    try {
        const response = await processAdminCommand(text, agent, activeEnvironment, callbacks);
        appendAdminChatLog('admin', response);
    } catch (err) {
        console.error("Admin Agent Console error:", err);
        appendAdminChatLog('admin', "Đã xảy ra lỗi hệ thống khi xử lý mệnh lệnh của bạn.");
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

/**
 * Clamp a numeric value to [min, max].
 * Handles non-numeric input by defaulting to 0 before clamping.
 */
function clampValue(val, min, max) {
    return Math.max(min, Math.min(max, parseFloat(val) || 0));
}

// Whitelist of XML tag names the LLM is permitted to emit.
// Any tag not in this set is logged as a warning and ignored by the parsers below.
const KNOWN_XML_TAGS = new Set([
    'add_memory', 'add_belief', 'body_update', 'stat_update',
    'neuro_update', 'env_change_location', 'env_update_item',
    'env_delete_item', 'env_create_location', 'description'
]);

export async function processAdminCommand(text, agent, activeEnvironment, callbacks = {}) {
    if (!agent || typeof SillyTavern === 'undefined') return "Không tìm thấy bộ não nhân vật đang hoạt động.";
    
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
        if (callbacks.saveState) callbacks.saveState();
        if (callbacks.refreshUI) callbacks.refreshUI();
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
        const reply = await SillyTavern.getContext().generateQuietPrompt({ quietPrompt: prompt, responseLength: 1000 });
        if (reply && reply.trim()) {
            let changed = false;

            // Whitelist check: warn about any XML tags not in the known set
            const allTagsInReply = reply.match(/<\/?([a-z_][a-z0-9_]*)/gi) || [];
            for (const rawTag of allTagsInReply) {
                const tagName = rawTag.replace(/^<\/?/, '').toLowerCase();
                if (!KNOWN_XML_TAGS.has(tagName)) {
                    console.warn(`[BackstageConsole] Unknown XML tag ignored: <${tagName}>`);
                }
            }

            // Parse add_memory
            const addMemRegex = /<add_memory\s+emotion=["'](\w+)["']\s*>([\s\S]*?)<\/add_memory>/gi;
            let addMatch;
            while ((addMatch = addMemRegex.exec(reply)) !== null) {
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
                        agent.body_status[key] = clampValue(val, 0.0, 10.0);
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
                        neuro[key] = clampValue(neuro[key] + val, 0.0, 10.0);
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
                refreshEnvironmentUI(activeEnvironment);
                changed = true;
            }

            if (changed) {
                agent.updateDynamicMentalState();
                if (callbacks.saveState) callbacks.saveState();
                if (callbacks.refreshUI) callbacks.refreshUI();
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
