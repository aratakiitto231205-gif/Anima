// v11.0
import { CognitiveAgent } from '../core/CognitiveAgent.js';
import { logAnima } from './logger.js';

let activeAgent = null;

export function getCharacterMemory() {
    if (typeof SillyTavern === 'undefined') return null;
    const context = SillyTavern.getContext();
    const id = context && context.characterId !== undefined ? context.characterId : context && context.groupId;
    if (!context || id === undefined || !context.characters) return null;
    const character = context.characters[id];
    if (!character) return null;
    return (character.data && character.data.extensions && character.data.extensions.cognitive_memory) || null;
}

export function getActiveAgent() {
    if (activeAgent) return activeAgent;
    const memory = getCharacterMemory();
    if (!memory) {
        if (typeof SillyTavern !== 'undefined') {
            const context = SillyTavern.getContext();
            const id = context && context.characterId !== undefined ? context.characterId : context && context.groupId;
            const charObj = id !== undefined && context && context.characters ? context.characters[id] : null;
            if (charObj) {
                logAnima('info', 'System', `Khởi tạo bộ não mới cho nhân vật: ${charObj.name}`);
                activeAgent = new CognitiveAgent(null);
                saveActiveAgentState();
                return activeAgent;
            } else {
                console.warn(
                    'Anima Engine: characterId/groupId is undefined or character not found. getActiveAgent returning null.'
                );
            }
        }
        return null;
    }
    activeAgent = new CognitiveAgent(memory);
    return activeAgent;
}

export function saveActiveAgentState() {
    if (!activeAgent || typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    const id = context && context.characterId !== undefined ? context.characterId : context && context.groupId;
    if (!context || id === undefined || !context.characters) return;

    const state = activeAgent.serialize();
    const character = context.characters[id];
    if (character) {
        if (!character.data) character.data = {};
        if (!character.data.extensions) character.data.extensions = {};
        character.data.extensions.cognitive_memory = state;
    }
    if (typeof context.writeExtensionField === 'function') {
        context.writeExtensionField(id, 'cognitive_memory', state);
    }
}

export function resetActiveAgent() {
    activeAgent = null;
}
