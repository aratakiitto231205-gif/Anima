// v11.0
import { parseNarrativeXml } from '../utils/xmlParser.js';
import { applyParsedToAgent } from '../core/StateApplier.js';
import { getFormattedMessageHtml } from './renderMessage.js';

export { convertProseToXml } from '../utils/xmlParser.js';

export async function renderParsedMessage(messageId, rawText, isHistory = false, getActiveAgentFn, saveAgentStateFn, refreshUIFn) {
    const parsed = parseNarrativeXml(rawText);
    if (typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();

    // 1. Update thought/emotion display
    if (context && context.chat && Number(messageId) === context.chat.length - 1) {
        updateThoughtDisplay(parsed);
        updateEmotionDisplay(parsed);
    }

    // 2. Apply to agent state
    if (!isHistory && context?.characterId !== undefined && getActiveAgentFn) {
        const agent = getActiveAgentFn();
        if (agent) {
            const changed = await applyParsedToAgent(agent, parsed, messageId, context);
            if (changed) {
                agent.updateDynamicMentalState();
                if (saveAgentStateFn) saveAgentStateFn();
                if (refreshUIFn) refreshUIFn();
            }
        }
    }

    // 3. Render to DOM
    setTimeout(() => renderToDom(messageId, rawText, parsed), 100);
}

function updateThoughtDisplay(parsed) {
    if (parsed.thought) {
        const thoughtsEl = document.getElementById('cog_dash_thoughts');
        if (thoughtsEl) thoughtsEl.innerText = parsed.thought;
    }
}

function updateEmotionDisplay(parsed) {
    if (parsed.emotion) {
        const emotionEl = document.getElementById('cog_dash_emotion');
        if (emotionEl) {
            const emojis = {
                anger: 'Giận dữ 😡',
                happy: 'Vui vẻ 😊',
                sad: 'U sầu 😢',
                fear: 'Lo sợ 😨',
                neutral: 'Bình thường 😐'
            };
            emotionEl.innerText = emojis[parsed.emotion.toLowerCase()] || parsed.emotion;
        }
    }
}

function renderToDom(messageId, rawText, parsed) {
    const messageEl = document.querySelector(`#chat .mes[mesid="${messageId}"]`);
    const messageTextEl = document.querySelector(`#chat .mes[mesid="${messageId}"] .mes_text`);

    if (messageEl && messageTextEl) {
        if (messageTextEl.querySelector('textarea') || messageTextEl.querySelector('input') || messageEl.classList.contains('editing')) {
            return;
        }

        const hasTags = ['animaing', 'emotion', 'dialogue', 'action', 'environment', 'sfx'].some(tag => rawText.includes(`<${tag}>`) || rawText.includes(`</${tag}>`));
        if (!hasTags) return; // Do not touch DOM for non-Anima messages!

        messageEl.classList.remove('cog-emotion-anger', 'cog-emotion-happy', 'cog-emotion-sad', 'cog-emotion-fear');
        if (parsed.emotion) {
            messageEl.classList.add(`cog-emotion-${parsed.emotion.toLowerCase().trim()}`);
        }

        messageTextEl.innerHTML = getFormattedMessageHtml(rawText);
    }
}

let chatObserver = null;

export function startChatObserver(getActiveAgentFn, saveAgentStateFn, refreshUIFn) {
    if (chatObserver) return;

    const chatEl = document.getElementById('chat');
    if (!chatEl) {
        setTimeout(() => startChatObserver(getActiveAgentFn, saveAgentStateFn, refreshUIFn), 1000);
        return;
    }

    chatObserver = new MutationObserver((mutations) => {
        if (typeof SillyTavern === 'undefined') return;
        const context = SillyTavern.getContext();
        let needsRender = false;

        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0 || mutation.type === 'childList') {
                needsRender = true;
            }
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target && target.classList && target.classList.contains('mes') && !target.classList.contains('editing')) {
                    needsRender = true;
                }
            }
        });

        if (needsRender) {
            const messages = chatEl.querySelectorAll('.mes');
            messages.forEach(messageEl => {
                const messageId = messageEl.getAttribute('mesid');
                if (messageId === null || messageId === undefined) return;

                const messageTextEl = messageEl.querySelector('.mes_text');
                if (!messageTextEl) return;

                if (messageTextEl.querySelector('textarea') || messageTextEl.querySelector('input') || messageEl.classList.contains('editing')) {
                    return;
                }

                const idx = Number(messageId);
                const chatLog = context.chat || [];
                const msgObj = chatLog[idx];
                if (msgObj && (msgObj.is_user || msgObj.is_system)) return;

                if (msgObj && msgObj.mes) {
                    const hasTags = ['animaing', 'emotion', 'dialogue', 'action', 'environment', 'sfx'].some(tag => msgObj.mes.includes(`<${tag}>`) || msgObj.mes.includes(`</${tag}>`));
                    if (!hasTags) return; // Do not touch DOM if it has no Anima XML tags!
                }

                const hasVnStyle = messageTextEl.querySelector('.cog-dialogue-text') || messageTextEl.querySelector('.cog-action-caption') || messageTextEl.querySelector('.cog-system-environment');
                if (!hasVnStyle && msgObj && msgObj.mes) {
                    chatObserver.disconnect();
                    setTimeout(() => {
                        renderParsedMessage(messageId, msgObj.mes, true, getActiveAgentFn, saveAgentStateFn, refreshUIFn);
                        chatObserver.observe(chatEl, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeFilter: ['class']
                        });
                    }, 50);
                }
            });
        }
    });

    chatObserver.observe(chatEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
}
