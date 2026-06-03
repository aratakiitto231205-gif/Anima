/**
 * SubconsciousTicker.js - v10.0 (Subconscious Background Ticker Service)
 * 
 * Ticker chạy ngầm mỗi 45 giây để mô phỏng sự suy giảm hormone tự nhiên,
 * phai nhạt trí nhớ đệm STM Ebbinghaus, tích lũy cơn đói/khát/mệt mỏi thời gian thực,
 * và phát sinh các dòng suy tư tiềm thức tự phát thơ mộng khi Hitsuji vắng mặt.
 */

let subconsciousIntervalId = null;

export function startSubconsciousTicker(getActiveAgentFn, saveAgentStateFn, refreshUIFn) {
    if (subconsciousIntervalId) clearInterval(subconsciousIntervalId);
    
    subconsciousIntervalId = setInterval(() => {
        try {
            if (!getActiveAgentFn) return;
            const agent = getActiveAgentFn();
            if (agent) {
                const lastTime = new Date(agent.last_update_timestamp).getTime();
                const elapsed = (Date.now() - lastTime) / 60000;
                
                if (elapsed >= 0.5) {
                    agent.tickPhysicalSensations(elapsed, false);
                    agent.hormones.decay(elapsed, agent.body, agent.genetics);
                    agent.memory.decayShortTermMemory(elapsed);
                    agent.updateDynamicMentalState();
                    agent.last_update_timestamp = new Date().toISOString();
                    if (saveAgentStateFn) saveAgentStateFn();
                    if (refreshUIFn) refreshUIFn();
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

export function stopSubconsciousTicker() {
    if (subconsciousIntervalId) {
        clearInterval(subconsciousIntervalId);
        subconsciousIntervalId = null;
    }
}

export function generateSpontaneousSubconsciousThought(agent) {
    if (typeof SillyTavern === 'undefined') return;
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
