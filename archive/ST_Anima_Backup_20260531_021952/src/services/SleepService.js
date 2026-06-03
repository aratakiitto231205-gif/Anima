/**
 * SleepService.js - v10.0 (Biological Sleep & Memory Consolidation Service)
 * 
 * Quản lý chu kỳ ngủ sâu của nhân vật, kích hoạt LLM để tạo giấc mơ nghệ thuật
 * và củng cố ký ức ngắn hạn (STM) thành dài hạn (LTM).
 */

import { generateQuietPrompt } from '../../../../../../script.js';
import { syncVectorMemoryCard } from './VectorMemoryService.js';

export async function triggerSleepConsolidationLLM(agent, sleepDurationMinutes, wasInterrupted, callbacks = {}) {
    if (!agent || typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    const characterId = context.characterId;
    if (characterId === undefined) return;
    const characterName = context.characters[characterId]?.name || "Nhân vật";

    // toastr là đối tượng toàn cục hiển thị thông báo trong SillyTavern
    if (typeof toastr !== 'undefined') {
        if (wasInterrupted) {
            toastr.warning(`${characterName} bị đánh thức đột ngột giữa giấc ngủ! 😰`, "Cắt đứt Cơn mơ");
        } else {
            toastr.info(`${characterName} đang bắt đầu củng cố giấc ngủ dài và chuẩn bị thức dậy...`, "Củng cố Giấc ngủ 😴");
        }
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
        if (typeof toastr !== 'undefined') {
            toastr.warning(`Nhân vật thức giấc trong trạng thái uể oải cực độ và giật mình! Cơn mơ bị cắt đứt!`, "Đánh thức đột ngột 😨");
        }
    } else {
        agent.hormones.levels.adrenaline = 2.0;
        agent.hormones.levels.cortisol = 2.0;
        agent.hormones.levels.melatonin = 2.0;
        agent.hormones.levels.serotonin = 7.0;
        agent.hormones.levels.dopamine = 6.0;
        agent.body_status.energy = 10.0;
        agent.body_status.pain = Math.max(agent.body_status.pain - 4.5, 0.0);
        agent.body = 'Bình thường, khỏe mạnh. Cơ thể sảng khoái và tràn ngập sinh khí sau một giấc ngủ ngon.';
        if (typeof toastr !== 'undefined') {
            toastr.success(`Củng cố giấc ngủ trọn vẹn thành công! Ngủ dậy vô cùng sảng khoái!`, "Thức dậy sảng khoái 😴");
        }
    }

    agent.memory.decayLongTermMemory();
    agent.updateDynamicMentalState();
    agent.last_update_timestamp = new Date().toISOString();
    
    agent.active_idle_event_nudge = `\n\n[TRẠNG THÁI GIẤC MƠ ĐÊM QUA]:
Bạn vừa thức dậy sau giấc ngủ dài. Đêm qua bạn đã trải qua giấc mơ sau:
"${dreamContent}"
Trạng thái thức giấc hiện tại: ${wasInterrupted ? 'Bị giật mình đánh thức đột ngột giữa chừng' : 'Thức dậy một cách tự nhiên, vô cùng sảng khoái'}.
Hãy tinh tế thể hiện trải nghiệm giấc mơ này cùng với cảm xúc và vết thương thể chất vào suy nghĩ <thought> và lời thoại <dialogue> của bạn một cách nghệ thuật nhất.`;

    if (callbacks.saveState) callbacks.saveState();
    if (callbacks.refreshUI) callbacks.refreshUI();
}
