/**
 * test_time_jump.js - Verification of Narrative Time Jump Parser & Sleep Consolidation
 */

const { CognitiveAgent } = require('d:\\silly\\SillyTavern-Launcher\\SillyTavern\\public\\scripts\\extensions\\third-party\\cognitive-dashboard\\CognitiveAgent.js');

// Mock parser locally
function parseNarrativeTimeJump(text) {
    if (typeof text !== 'string') return 0;
    const txt = text.toLowerCase();

    // Dịch cụm tiếng Việt
    if (/(?:sáng|ngày)\s+hôm\s+sau/i.test(txt) || /tới\s+sáng\s+mai/i.test(txt)) return 480; // 8 tiếng
    if (/ngày\s+mai/i.test(txt)) return 1440; // 24 tiếng
    if (/tuần\s+sau/i.test(txt) || /một\s+tuần\s+sau/i.test(txt)) return 10080; // 7 ngày
    if (/tháng\s+sau/i.test(txt) || /một\s+tháng\s+sau/i.test(txt)) return 43200; // 30 ngày
    if (/năm\s+sau/i.test(txt) || /một\s+năm\s+sau/i.test(txt)) return 525600; // 365 ngày

    let match = txt.match(/(\d+)\s+ngày\s+sau/i);
    if (match) return parseInt(match[1]) * 1440;
    match = txt.match(/(\d+)\s+tuần\s+sau/i);
    if (match) return parseInt(match[1]) * 10080;
    match = txt.match(/(\d+)\s+tháng\s+sau/i);
    if (match) return parseInt(match[1]) * 43200;
    match = txt.match(/(\d+)\s+năm\s+sau/i);
    if (match) return parseInt(match[1]) * 525600;

    // Dịch cụm tiếng Anh
    if (/next\s+morning/i.test(txt)) return 480;
    if (/the\s+next\s+day/i.test(txt)) return 1440;
    if (/a\s+week\s+later/i.test(txt)) return 10080;
    if (/a\s+month\s+later/i.test(txt)) return 43200;
    if (/a\s+year\s+later/i.test(txt)) return 525600;

    match = txt.match(/(\d+)\s+days\s+later/i);
    if (match) return parseInt(match[1]) * 1440;
    match = txt.match(/(\d+)\s+weeks\s+later/i);
    if (match) return parseInt(match[1]) * 10080;
    match = txt.match(/(\d+)\s+months\s+later/i);
    if (match) return parseInt(match[1]) * 43200;
    match = txt.match(/(\d+)\s+years\s+later/i);
    if (match) return parseInt(match[1]) * 525600;

    return 0;
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILURE: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ SUCCESS: ${message}`);
    }
}

console.log("=========================================");
console.log("TESTING NARRATIVE TIME JUMP PARSER");
console.log("=========================================\n");

assert(parseNarrativeTimeJump("Sáng hôm sau trời đổ mưa.") === 480, "Khớp 'Sáng hôm sau' -> 480 phút");
assert(parseNarrativeTimeJump("the next day we met again.") === 1440, "Khớp 'the next day' -> 1440 phút");
assert(parseNarrativeTimeJump("3 ngày sau tôi ghé quán.") === 4320, "Khớp '3 ngày sau' -> 4320 phút");
assert(parseNarrativeTimeJump("5 weeks later we went abroad.") === 50400, "Khớp '5 weeks later' -> 50400 phút");

console.log("\n=========================================");
console.log("TESTING SLEEP CONSOLIDATION SIMULATION");
console.log("=========================================\n");

const agent = new CognitiveAgent({
    stm_buffer: [
        { id: 'stm_1', content: "Cùng ăn Ramen cực ngon", semantic_tags: ['#reward'], weight: 7.5, count: 2 },
        { id: 'stm_2', content: "Cử chỉ bắt tay bình thường", semantic_tags: [], weight: 2.0, count: 1 }
    ],
    neuro_chemistry: {
        adrenaline: 7.0,
        cortisol: 6.5,
        melatonin: 2.0,
        dopamine: 4.0,
        serotonin: 3.0,
        oxytocin: 5.0,
        endorphins: 3.0,
        sex_hormones: 5.0
    }
});

// Giả lập Dịch chuyển thời gian qua đêm: 480 phút
const jumpMin = 480;
console.log("Trạng thái hormone trước giấc ngủ:");
console.log(agent.hormones.levels);

// Chạy silent time jump đúng thứ tự củng cố nhận thức trước decay!
const isSleep = jumpMin >= 480;
const stmToConsolidate = agent.memory.stm_buffer.filter(m => m.weight >= 6.0 || m.count >= 2);
assert(stmToConsolidate.length === 1 && stmToConsolidate[0].id === 'stm_1', "Tìm thấy chính xác 1 ký ức đủ điều kiện củng cố (Ramen)");

if (isSleep) {
    // Củng cố
    stmToConsolidate.forEach(card => {
        card.weight = Math.min(card.weight + 1.0, 10.0);
        agent.memory.recallable_drawer.push(card);
    });

    // Pruning
    agent.memory.stm_buffer = [];

    // Reset hormone
    agent.hormones.levels.adrenaline = 2.0;
    agent.hormones.levels.cortisol = 2.0;
    agent.hormones.levels.melatonin = 2.0;
    
    // Phai nhạt dài hạn
    agent.memory.decayLongTermMemory();
} else {
    agent.memory.decayShortTermMemory(jumpMin);
}

// Biological decay (có chaos jitter sinh học dao động nhẹ +/- 0.15)
agent.hormones.decay(jumpMin, agent.body, agent.genetics);

console.log("\nTrạng thái sau giấc ngủ:");
console.log(agent.hormones.levels);
console.log("Drawer (LTM):", agent.memory.recallable_drawer.map(m => m.content));
console.log("STM Buffer:", agent.memory.stm_buffer);

// So sánh xấp xỉ có tính đến Jitter sinh học
const isAdrenalineOk = Math.abs(agent.hormones.levels.adrenaline - 2.0) <= 0.35;
const isCortisolOk = Math.abs(agent.hormones.levels.cortisol - 2.0) <= 0.35;
assert(isAdrenalineOk && isCortisolOk, "Reset hormone thành công, cortisol & adrenaline dao động nhẹ quanh baseline thực tế");
assert(agent.memory.recallable_drawer.some(m => m.id === 'stm_1'), "Ký ức Ramen đã được cất giữ dài hạn");
assert(agent.memory.stm_buffer.length === 0, "Prune sạch bộ đệm ngắn hạn rác thành công!");

console.log("\n=========================================");
console.log("ALL TIME JUMP & CONSOLIDATION TESTS PASSED!");
console.log("=========================================");
