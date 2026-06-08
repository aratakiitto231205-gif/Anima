import { triggerSleepConsolidationLLM } from '../services/SleepService.js';
import { THRESHOLDS } from '../utils/constants.js';

/**
 * SleepDetector - Phát hiện trạng thái ngủ và kích hoạt consolidation
 */

export function isSleeping(agent) {
    if (!agent) return false;
    return agent.hormones.levels.melatonin >= THRESHOLDS.SLEEP_MELATONIN_THRESHOLD;
}

export function wakeFromSleep(agent) {
    if (!agent) return;

    agent.hormones.levels.melatonin = Math.max(agent.hormones.levels.melatonin - 2.5, 5.5);
    agent.hormones.levels.adrenaline = Math.min(agent.hormones.levels.adrenaline + 4.5, 9.5);
    agent.hormones.levels.cortisol = Math.min(agent.hormones.levels.cortisol + 2.0, 8.0);
    agent.body_status.energy = Math.min(agent.body_status.energy + 4.0, 6.5);
    agent.body = `Đầu óc lơ mơ, uể oải tột độ do bị đánh thức đột ngột giữa giấc ngủ.`;
    agent.updateDynamicMentalState();
}

export function handleSleepInterruption(agent, lastUserMsg, lastProcessedUserMsg, callbacks) {
    if (!agent || !lastUserMsg || lastUserMsg === lastProcessedUserMsg) {
        return { shouldProcess: false, newLastProcessedUserMsg: lastProcessedUserMsg };
    }

    const sleeping = isSleeping(agent);

    if (sleeping) {
        const lastTime = new Date(agent.last_update_timestamp).getTime();
        const elapsed = (Date.now() - lastTime) / 60000;

        wakeFromSleep(agent);

        if (callbacks.saveState) callbacks.saveState();

        triggerSleepConsolidationLLM(agent, elapsed, true, callbacks);

        return { shouldProcess: true, newLastProcessedUserMsg: lastUserMsg, wasSleeping: true };
    }

    return { shouldProcess: true, newLastProcessedUserMsg: lastUserMsg, wasSleeping: false };
}
