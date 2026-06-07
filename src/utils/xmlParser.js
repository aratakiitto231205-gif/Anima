// v11.0
import { NARRATIVE_BLOCK_TAGS } from './constants.js';

export const KNOWN_NARRATIVE_TAGS = new Set([
    'animaing', 'emotion', 'dialogue', 'action', 'environment', 'sfx',
    'body_update', 'neuro_update', 'memory_update', 'change_location', 'environment_update'
]);

export const KNOWN_BACKSTAGE_TAGS = new Set([
    'add_memory', 'add_belief', 'body_update', 'stat_update', 'neuro_update',
    'env_change_location', 'env_update_item', 'env_delete_item', 'env_create_location',
    'change_location', 'update_item', 'delete_item', 'create_location',
    'description', 'dream', 'consolidate'
]);

export function parseNarrativeXml(text) {
    const result = {
        thought: '',
        emotion: 'neutral',
        blocks: [],
        auxTags: {
            memoryUpdate: undefined,
            bodyUpdate: undefined,
            neuroUpdate: undefined,
            changeLocation: undefined,
            environmentUpdate: undefined,
            memory_update: undefined,
            body_update: undefined,
            neuro_update: undefined,
            change_location: undefined,
            environment_update: undefined
        }
    };

    if (!text) return result;

    const thoughtRegex = /<animaing>([\s\S]*?)(?:<\/animaing>|$)/gi;
    let thoughtMatch;
    const thoughts = [];
    while ((thoughtMatch = thoughtRegex.exec(text)) !== null) {
        if (thoughtMatch[1]) thoughts.push(thoughtMatch[1].trim());
    }
    result.thought = thoughts.join('\n').trim();

    const emotionMatch = /<emotion>([\s\S]*?)(?:<\/emotion>|$)/i.exec(text);
    if (emotionMatch) result.emotion = emotionMatch[1].trim().toLowerCase();

    const tagExtract = (tag) => {
        const m = new RegExp(`<${tag}>([\\s\\S]*?)(?:</${tag}>|$)`, 'i').exec(text);
        return m ? m[1].trim() : undefined;
    };

    const memoryUpdate = tagExtract('memory_update');
    const bodyUpdate = tagExtract('body_update');
    const neuroUpdate = tagExtract('neuro_update');
    const changeLocation = tagExtract('change_location');
    const environmentUpdate = tagExtract('environment_update');

    result.auxTags = {
        memoryUpdate,
        bodyUpdate,
        neuroUpdate,
        changeLocation,
        environmentUpdate,
        memory_update: memoryUpdate,
        body_update: bodyUpdate,
        neuro_update: neuroUpdate,
        change_location: changeLocation,
        environment_update: environmentUpdate
    };

    const textToRender = text
        .replace(/<animaing>[\s\S]*?<\/animaing>/gi, '')
        .replace(/<animaing>[\s\S]*/gi, '')
        .replace(/<emotion>[\s\S]*?<\/emotion>/gi, '')
        .replace(/<emotion>[\s\S]*/gi, '')
        .replace(/<memory_update>[\s\S]*?<\/memory_update>/gi, '')
        .replace(/<memory_update>[\s\S]*/gi, '')
        .replace(/<body_update>[\s\S]*?<\/body_update>/gi, '')
        .replace(/<body_update>[\s\S]*/gi, '')
        .replace(/<neuro_update>[\s\S]*?<\/neuro_update>/gi, '')
        .replace(/<neuro_update>[\s\S]*/gi, '')
        .replace(/<change_location>[\s\S]*?<\/change_location>/gi, '')
        .replace(/<change_location>[\s\S]*/gi, '')
        .replace(/<environment_update>[\s\S]*?<\/environment_update>/gi, '')
        .replace(/<environment_update>[\s\S]*/gi, '');

    const hasAnyTag = NARRATIVE_BLOCK_TAGS.some(tagName => text.includes(`<${tagName}>`));

    if (!hasAnyTag) {
        const parts = textToRender.split(/(\*[^*]+\*)/g);
        parts.forEach(part => {
            const trimmed = part.trim();
            if (!trimmed) return;
            if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
                result.blocks.push({ type: 'action', content: trimmed.slice(1, -1).trim() });
            } else {
                const quotes = trimmed.split(/(["'«“][^"'«“]+["'»”])/g);
                quotes.forEach(q => {
                    const qTrimmed = q.trim();
                    if (!qTrimmed) return;
                    if (/^["'«“]/.test(qTrimmed) && /["'»”]$/.test(qTrimmed)) {
                        result.blocks.push({ type: 'dialogue', content: qTrimmed.replace(/^["'«“]|["'»”]$/g, '').trim() });
                    } else {
                        result.blocks.push({ type: 'narration', content: qTrimmed });
                    }
                });
            }
        });
        return result;
    }

    const splitRegex = /(<(?:dialogue|action|environment|sfx)>[\s\S]*?<\/(?:dialogue|action|environment|sfx)>)/gi;
    const parts = textToRender.split(splitRegex);

    parts.forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) return;

        const tagMatch = trimmed.match(/^<(dialogue|action|environment|sfx)>([\s\S]*?)<\/\1>$/i);
        if (tagMatch) {
            result.blocks.push({
                type: tagMatch[1].toLowerCase(),
                content: tagMatch[2].trim()
            });
        } else {
            const cleanNarration = trimmed.replace(/<\/?(?:dialogue|action|environment|sfx)>/gi, '').trim();
            if (cleanNarration) {
                result.blocks.push({ type: 'narration', content: cleanNarration });
            }
        }
    });

    return result;
}

export function parseBackstageXml(text) {
    const result = {
        memories: [],
        beliefs: [],
        bodyUpdate: undefined,
        statUpdate: undefined,
        neuroUpdate: undefined,
        envChanges: {
            changeLocation: undefined,
            updateItems: [],
            deleteItems: [],
            createLocations: []
        }
    };

    if (!text) return result;

    const addMemRegex = /<add_memory(?:\s+emotion=["'](\w+)["'])?\s*>([\s\S]*?)<\/add_memory>/gi;
    let addMatch;
    while ((addMatch = addMemRegex.exec(text)) !== null) {
        const emotion = addMatch[1] || 'joy';
        const content = addMatch[2].trim();
        result.memories.push({ emotion, content });
    }

    const beliefRegex = /<add_belief>([\s\S]*?)<\/add_belief>/gi;
    let beliefMatch;
    while ((beliefMatch = beliefRegex.exec(text)) !== null) {
        result.beliefs.push(beliefMatch[1].trim());
    }

    const bodyMatch = /<body_update>([\s\S]*?)<\/body_update>/i.exec(text);
    if (bodyMatch) {
        result.bodyUpdate = bodyMatch[1].trim();
    }

    const statMatch = /<stat_update>([\s\S]*?)<\/stat_update>/i.exec(text);
    if (statMatch) {
        result.statUpdate = statMatch[1].trim();
    }

    const neuroMatch = /<neuro_update>([\s\S]*?)<\/neuro_update>/i.exec(text);
    if (neuroMatch) {
        result.neuroUpdate = neuroMatch[1].trim();
    }

    const locMatch = /<(?:env_)?change_location>([\s\S]*?)<\/(?:env_)?change_location>/i.exec(text);
    if (locMatch) {
        result.envChanges.changeLocation = locMatch[1].trim();
    }

    const updateItemRegex = /<(?:env_)?update_item\s+location=["']([^"']+)["']\s+name=["']([^"']+)["']\s+state=["']([^"']+)["']\s+quantity=["'](\d+)["']\s*\/>/gi;
    let updateMatch;
    while ((updateMatch = updateItemRegex.exec(text)) !== null) {
        result.envChanges.updateItems.push({
            location: updateMatch[1].trim(),
            name: updateMatch[2].trim(),
            state: updateMatch[3].trim(),
            quantity: parseInt(updateMatch[4]) || 1
        });
    }

    const deleteItemRegex = /<(?:env_)?delete_item\s+location=["']([^"']+)["']\s+name=["']([^"']+)["']\s*\/>/gi;
    let deleteMatch;
    while ((deleteMatch = deleteItemRegex.exec(text)) !== null) {
        result.envChanges.deleteItems.push({
            location: deleteMatch[1].trim(),
            name: deleteMatch[2].trim()
        });
    }

    const createLocRegex = /<(?:env_)?create_location\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/(?:env_)?create_location>/gi;
    let createMatch;
    while ((createMatch = createLocRegex.exec(text)) !== null) {
        const name = createMatch[1].trim();
        const inner = createMatch[2];
        const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(inner);
        const description = descMatch ? descMatch[1].trim() : "Không có mô tả bối cảnh.";
        result.envChanges.createLocations.push({ name, description });
    }

    return result;
}

export function convertProseToXml(text) {
    if (!text || typeof text !== 'string') return text;
    if (text.includes('<animaing>') || text.includes('<dialogue>')) {
        return text;
    }

    const blocks = [];
    const parts = text.split(/(\*[^*]+\*)/g);
    parts.forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
            blocks.push(`<action>${trimmed.slice(1, -1).trim()}</action>`);
        } else {
            const quotes = trimmed.split(/(["'«“][^"'«“]+["'»”])/g);
            quotes.forEach(q => {
                const qTrimmed = q.trim();
                if (!qTrimmed) return;
                if (/^["'«“]/.test(qTrimmed) && /["'»”]$/.test(qTrimmed)) {
                    blocks.push(`<dialogue>${qTrimmed.replace(/^["'«“]|["'»”]$/g, '').trim()}</dialogue>`);
                } else {
                    blocks.push(`<action>${qTrimmed}</action>`);
                }
            });
        }
    });

    return `<animaing>Phản hồi tự nhiên.</animaing>\n<emotion>neutral</emotion>\n` + blocks.join('\n');
}
