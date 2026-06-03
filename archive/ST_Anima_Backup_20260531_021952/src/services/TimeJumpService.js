/**
 * TimeJumpService.js - v10.0 (Narrative Time Jump Service)
 * 
 * Quản lý dịch chuyển thời gian kể chuyện động, áp dụng phân rã sinh học 
 * và củng cố nhận thức tương ứng với số phút tua nhanh.
 */

import { triggerSleepConsolidationLLM } from './SleepService.js';

export async function executeTimeJump(minutes, agent, callbacks = {}) {
    if (!agent) return;

    if (typeof toastr !== 'undefined') {
        toastr.info(`Đang thực hiện dịch chuyển thời gian kể chuyện: ${minutes} phút...`, "Dịch chuyển Thời gian Kể chuyện ⏳");
    }

    if (minutes >= 480) {
        await triggerSleepConsolidationLLM(agent, minutes, false, callbacks);
    } else {
        agent.memory.decayShortTermMemory(minutes);
        agent.hormones.decay(minutes, agent.body, agent.genetics);
        agent.tickPhysicalSensations(minutes, false);
        if (typeof toastr !== 'undefined') {
            toastr.info(`Dịch chuyển thời gian thành công. Bộ đệm ngắn hạn tự động phai nhạt tự nhiên.`, "Dịch chuyển Thời gian ⏳");
        }
    }

    agent.updateDynamicMentalState();
    agent.last_update_timestamp = new Date().toISOString();
    
    if (callbacks.saveState) callbacks.saveState();
    if (callbacks.refreshUI) callbacks.refreshUI();
}
