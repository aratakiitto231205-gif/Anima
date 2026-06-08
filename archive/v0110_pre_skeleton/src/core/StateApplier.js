// v0.11.0
import { syncVectorMemoryCard } from '../services/VectorMemoryService.js';
import { getCharacterEnvironment, saveCharacterEnvironment } from '../services/EnvironmentService.js';
import { refreshEnvironmentUI } from '../ui/DashboardUI.js';
import { logAnima } from '../utils/logger.js';

export async function applyParsedToAgent(agent, parsed, messageId, context) {
    let changed = false;

    if (parsed.auxTags.body_update) {
        agent.body = parsed.auxTags.body_update;
        changed = true;
    }

    if (parsed.auxTags.neuro_update) {
        const neuro = agent.hormones.levels;
        const regex = /([a-z_]+)\s*:\s*([+-]?\d+(\.\d+)?)/gi;
        let match;
        while ((match = regex.exec(parsed.auxTags.neuro_update)) !== null) {
            const key = match[1].toLowerCase().trim();
            const val = parseFloat(match[2]);
            if (neuro[key] !== undefined && !isNaN(val)) {
                // Clamp 0.0-10.0 to match hormone natural range (decay can reach 0)
                neuro[key] = Math.min(Math.max(neuro[key] + val, 0.0), 10.0);
                changed = true;
            }
        }
    }

    if (parsed.auxTags.memory_update) {
        agent.memory.learnMemoryDynamically(parsed.auxTags.memory_update, messageId, agent.hormones.levels);
        const newCard = agent.memory.recallable_drawer[agent.memory.recallable_drawer.length - 1];
        if (newCard) {
            try {
                await syncVectorMemoryCard(context.characterId, newCard, 'insert');
            } catch (err) {
                logAnima('error', 'StateApplier', `syncVectorMemoryCard failed: ${err.message}`);
            }
        }
        if (typeof toastr !== 'undefined') {
            toastr.success(`Đã ghi nhận ký ức dài hạn: "${parsed.auxTags.memory_update}"`, 'Học hỏi 🧠');
        }
        changed = true;
    }

    if (parsed.auxTags.change_location && context.characterId !== undefined) {
        const newLoc = parsed.auxTags.change_location.trim();
        try {
            const env = await getCharacterEnvironment(context.characterId);
            if (env && env.locations && env.locations[newLoc]) {
                env.active_location = newLoc;
                await saveCharacterEnvironment(context.characterId, env);
                refreshEnvironmentUI(env);
            }
        } catch (err) {
            logAnima('error', 'StateApplier', `change_location failed: ${err.message}`);
        }
    }

    return changed;
}
