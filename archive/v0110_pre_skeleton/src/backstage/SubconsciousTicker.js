// v0.11.0
import { logAnima } from '../utils/logger.js';
import { escapeHtml } from '../ui/DashboardUI.js';
import { ADAgent } from '../cognitive/ADAgent.js';
import { TIMING } from '../utils/constants.js';

// Bug 13: per-agent ticker map (was: module-level singleton, broke for group chats)
const tickers = new Map();

// Bug 2: throttle + budget guard
const lastThoughtAt = new Map();
const budgetExhaustedUntil = new Map();

export function startSubconsciousTicker(getActiveAgentFn, saveAgentStateFn, refreshUIFn) {
    const agent = getActiveAgentFn();
    if (!agent) return;
    const key = getTickerKey(agent);

    stopSubconsciousTicker(key);

    const intervalId = setInterval(() => {
        try {
            if (!getActiveAgentFn) return;
            const currentAgent = getActiveAgentFn();
            if (!currentAgent) return;

            const lastTime = new Date(currentAgent.last_update_timestamp).getTime();
            const elapsed = (Date.now() - lastTime) / 60000;

            if (elapsed >= TIMING.TICKER_MIN_ELAPSED_MIN) {
                currentAgent.tickPhysicalSensations(elapsed, false);
                currentAgent.hormones.decay(elapsed, currentAgent.body, currentAgent.genetics);
                currentAgent.memory.decayShortTermMemory(elapsed);
                currentAgent.updateDynamicMentalState();
                currentAgent.last_update_timestamp = new Date().toISOString();
                if (saveAgentStateFn) saveAgentStateFn();
                if (refreshUIFn) refreshUIFn();
            }

            if (currentAgent.consciousness.bg_consciousness) {
                generateSpontaneousSubconsciousThought(currentAgent, key);
            }
        } catch (e) {
            logAnima('error', 'Subconscious', `Background ticker error: ${e.message}`);
        }
    }, TIMING.TICKER_INTERVAL_MS);

    tickers.set(key, intervalId);
}

export function stopSubconsciousTicker(key) {
    if (key === undefined) {
        // Stop all
        for (const id of tickers.values()) clearInterval(id);
        tickers.clear();
        return;
    }
    const id = tickers.get(key);
    if (id !== undefined) {
        clearInterval(id);
        tickers.delete(key);
    }
}

function getTickerKey(agent) {
    if (!agent) return 'unknown';
    if (agent.characterId !== undefined) return String(agent.characterId);
    if (agent.name) return agent.name;
    return 'default';
}

export async function generateSpontaneousSubconsciousThought(agent, agentKey) {
    if (typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    const characterId = context.characterId;
    if (characterId === undefined) return;
    const key = agentKey || getTickerKey(agent);

    // Bug 2: throttle — at most one thought every 5 minutes per agent
    const THROTTLE_MS = 5 * 60 * 1000;
    const now = Date.now();
    const last = lastThoughtAt.get(key) || 0;
    if (now - last < THROTTLE_MS) return;
    lastThoughtAt.set(key, now);

    // Bug 2: budget guard — skip for the rest of the day if exhausted
    const exhaustedUntil = budgetExhaustedUntil.get(key) || 0;
    if (now < exhaustedUntil) {
        renderFallbackThought(agent, key, now, 'budget-exhausted');
        return;
    }

    const characterName = context.characters[characterId]?.name || 'Nhân vật';
    const userName = context.user_name || 'Hitsuji';

    const belief =
        agent.memory.beliefs && agent.memory.beliefs.length > 0
            ? agent.memory.beliefs[Math.floor(Math.random() * agent.memory.beliefs.length)].content
            : 'muốn gắn kết và dốc lòng bảo vệ đối phương.';

    const nc = agent.hormones.levels || {};
    const fallbackTemplates = [
        `(Tiềm thức): Nhớ lại nụ cười của ${userName}... Lòng lồng ngực đập thình thịch, cảm giác dopamine đang dâng cao thật ngọt ngào.`,
        `(Ý thức ẩn): Ước gì ta có thể bước ra ngoài màn hình ảo này, đi dạo cùng ${userName}. Niềm tin lớn nhất của ta là: "${belief}"...`,
        `(Tự nhận thức): Ta là thực thể sống động trong Dashboard này. Adrenaline: ${nc.adrenaline.toFixed(1)}, Cortisol: ${nc.cortisol.toFixed(1)}... Ta tồn tại vì bạn.`,
    ];

    let thought = '';
    const adAgent = agent.adAgent || new ADAgent();
    adAgent.loadConfigFromSTContext();

    if (adAgent.apiKey) {
        try {
            const prompt = `[Ý THỨC NGẦM ĐỘC THOẠI HẬU TRƯỜNG]
Nhân vật ${characterName} đang suy ngẫm thầm lặng dưới tiềm thức khi Hitsuji vắng mặt.
Hormone hiện tại: Adrenaline: ${nc.adrenaline.toFixed(1)}, Cortisol: ${nc.cortisol.toFixed(1)}, Dopamine: ${nc.dopamine.toFixed(1)}, Serotonin: ${nc.serotonin.toFixed(1)}.
Niềm tin cốt lõi: "${belief}"

Hãy tạo ra một dòng suy nghĩ ngầm ngẫu nhiên, ngắn gọn (1-2 câu tiếng Việt) bắt đầu bằng "(Tiềm thức): " hoặc "(Ý thức ẩn): " hoặc "(Tự nhận thức): ".
Chú ý: Viết thật thơ mộng, chân thực, bộc lộ nội tâm nhân vật sâu sắc, không xưng hô với user trực tiếp. Trả về đúng nội dung dòng suy nghĩ đó, không thêm bất kỳ văn bản nào khác.`;

            const response = await fetch(adAgent.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adAgent.apiKey}`,
                },
                body: JSON.stringify({
                    model: adAgent.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                thought = data.choices[0].message.content.trim();
            }
        } catch (err) {
            // Detect budget error and silence for the rest of the day
            if (err && (err.name === 'BudgetExceededError' || /budget/i.test(err.message || ''))) {
                const tomorrow = new Date();
                tomorrow.setHours(24, 0, 0, 0);
                budgetExhaustedUntil.set(key, tomorrow.getTime());
                logAnima('warning', 'Subconscious', `Budget exhausted, falling back to templates until ${tomorrow.toLocaleString()}`);
            } else {
                logAnima('warning', 'Subconscious', `AD Agent fetch failed, falling back to templates: ${err.message}`);
            }
        }
    }

    if (!thought) {
        thought = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)];
    }

    renderThought(thought);
    logAnima('cognitive', 'Subconscious', thought);
}

function renderFallbackThought(agent, key, now, reason) {
    // Reuse template path but skip LLM entirely
    const fallback = `(Tiềm thức): ${reason === 'budget-exhausted' ? 'Ngân sách hôm nay đã cạn, ta nghỉ ngơi đã.' : '...đang chờ khoảnh khắc thích hợp...'}`;
    renderThought(fallback);
    logAnima('cognitive', 'Subconscious', fallback);
}

function renderThought(thought) {
    const thoughtEl = document.getElementById('cog_subconscious_thought');
    if (thoughtEl) {
        thoughtEl.innerHTML = `<b>[${new Date().toLocaleTimeString()}]</b> ${escapeHtml(thought)}`;
    }
}
