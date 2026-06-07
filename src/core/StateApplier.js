// v11.0
import { syncVectorMemoryCard } from '../services/VectorMemoryService.js';
import { getCharacterEnvironment, saveCharacterEnvironment } from '../services/EnvironmentService.js';
import { refreshEnvironmentUI } from '../ui/DashboardUI.js';

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
                neuro[key] = Math.min(Math.max(neuro[key] + val, 1.0), 10.0);
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
                console.error('[StateApplier] syncVectorMemoryCard failed:', err);
            }
        }
        if (typeof toastr !== 'undefined') {
            toastr.success(`Đã ghi nhận ký ức dài hạn: "${parsed.auxTags.memory_update}"`, "Học hỏi 🧠");
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
            console.error('[StateApplier] change_location failed:', err);
        }
    }

    return changed;
}
