/**
 * DOMAutoHealing.js - v10.0 (MutationObserver & Visual Novel Style Healer)
 * 
 * Quản lý bóc tách thẻ XML Anima (<thought>, <dialogue>, <action>...)
 * và MutationObserver tự động vá DOM tin nhắn trong 50ms khi có chỉnh sửa.
 */

import { escapeHtml } from './DashboardUI.js';
import { syncVectorMemoryCard } from '../services/VectorMemoryService.js';

export function parseXmlTags(text) {
    const result = {
        thought: '',
        emotion: 'neutral',
        blocks: []
    };

    if (!text) return result;

    const thoughtRegex = /<thought>([\s\S]*?)(?:<\/thought>|$)/gi;
    let thoughtMatch;
    const thoughts = [];
    while ((thoughtMatch = thoughtRegex.exec(text)) !== null) {
        if (thoughtMatch[1]) thoughts.push(thoughtMatch[1].trim());
    }
    result.thought = thoughts.join('\n').trim();

    const emotionMatch = /<emotion>([\s\S]*?)(?:<\/emotion>|$)/i.exec(text);
    if (emotionMatch) result.emotion = emotionMatch[1].trim().toLowerCase();

    // Bóc tách các thẻ cập nhật chỉ số phụ trợ
    const tagExtract = (tag) => {
        const m = new RegExp(`<${tag}>([\\s\\S]*?)(?:</${tag}>|$)`, 'i').exec(text);
        return m ? m[1].trim() : undefined;
    };

    result.memory_update = tagExtract('memory_update');
    result.body_update = tagExtract('body_update');
    result.neuro_update = tagExtract('neuro_update');
    result.change_location = tagExtract('change_location');
    result.environment_update = tagExtract('environment_update');

    const textToRender = text
        .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
        .replace(/<thought>[\s\S]*/gi, '')
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

    const tagNames = ['dialogue', 'action', 'environment', 'sfx'];
    const hasAnyTag = tagNames.some(tagName => text.includes(`<${tagName}>`));

    if (!hasAnyTag) {
        // Hậu phác (fallback) phân tích prose thông thường
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

export function getFormattedMessageHtml(rawText, messageId) {
    const parsed = parseXmlTags(rawText);
    let htmlContent = '';
    parsed.blocks.forEach(block => {
        const safe = escapeHtml(block.content);
        if (block.type === 'environment') {
            htmlContent += `<div class="cog-system-environment"><i class="fa-solid fa-earth-americas"></i> ${safe}</div>`;
        } else if (block.type === 'action') {
            htmlContent += `<div class="cog-action-caption"><i class="fa-solid fa-person-walking"></i> ${safe}</div>`;
        } else if (block.type === 'narration') {
            htmlContent += `<div class="cog-action-caption">${safe}</div>`;
        } else if (block.type === 'dialogue') {
            htmlContent += `<div class="cog-dialogue-text">${safe}</div>`;
        } else if (block.type === 'sfx') {
            htmlContent += `<div class="cog-sfx-badge"><i class="fa-solid fa-volume-high"></i> ${safe}</div>`;
        }
    });

    if (!htmlContent.trim()) {
        if (parsed.thought) {
            htmlContent = `<div class="cog-action-caption"><i>*...*</i></div>`;
        } else {
            // Fallback an toàn nếu không nhận diện được bất kỳ định dạng nào
            htmlContent = `<div class="cog-action-caption">${escapeHtml(rawText)}</div>`;
        }
    }

    return htmlContent;
}

export function convertProseToXml(text) {
    if (!text || typeof text !== 'string') return text;
    if (text.includes('<thought>') || text.includes('<dialogue>')) {
        return text;
    }
    
    const blocks = [];
    // Phân tách prose thông thường thành thought/action/dialogue
    const parts = text.split(/(\*[^*]+\*)/g);
    parts.forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
            blocks.push(`<action>${trimmed.slice(1, -1).trim()}</action>`);
        } else {
            // Lọc thoại trong ngoặc kép
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
    
    return `<thought>Phản hồi tự nhiên.</thought>\n<emotion>neutral</emotion>\n` + blocks.join('\n');
}

export async function renderParsedMessage(messageId, rawText, isHistory = false, getActiveAgentFn, saveAgentStateFn, refreshUIFn) {
    const parsed = parseXmlTags(rawText);
    if (typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    if (context && context.chat && Number(messageId) === context.chat.length - 1) {
        if (parsed.thought) {
            const thoughtsEl = document.getElementById('cog_dash_thoughts');
            if (thoughtsEl) thoughtsEl.innerText = parsed.thought;
        }
        
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
    
    // Tự học tập / Cập nhật chỉ số từ các thẻ phụ trợ của AI
    if (!isHistory && context && context.characterId !== undefined && getActiveAgentFn) {
        const agent = getActiveAgentFn();
        if (agent) {
            let changed = false;
            
            if (parsed.body_update) {
                agent.body = parsed.body_update;
                changed = true;
            }
            
            if (parsed.neuro_update) {
                const neuro = agent.hormones.levels;
                const regex = /([a-z_]+)\s*:\s*([+-]?\d+(\.\d+)?)/gi;
                let match;
                while ((match = regex.exec(parsed.neuro_update)) !== null) {
                    const key = match[1].toLowerCase().trim();
                    const val = parseFloat(match[2]);
                    if (neuro[key] !== undefined && !isNaN(val)) {
                        neuro[key] = Math.min(Math.max(neuro[key] + val, 1.0), 10.0);
                        changed = true;
                    }
                }
            }

            if (parsed.memory_update) {
                agent.memory.learnMemoryDynamically(parsed.memory_update, messageId, agent.hormones.levels);
                const newCard = agent.memory.recallable_drawer[agent.memory.recallable_drawer.length - 1];
                if (newCard) {
                    try {
                        await syncVectorMemoryCard(context.characterId, newCard, 'insert');
                    } catch (err) {
                        console.error('[DOMAutoHealing] syncVectorMemoryCard failed:', err);
                    }
                }
                if (typeof toastr !== 'undefined') {
                    toastr.success(`Đã ghi nhận ký ức dài hạn: "${parsed.memory_update}"`, "Học hỏi 🧠");
                }
                changed = true;
            }

            if (changed) {
                agent.updateDynamicMentalState();
                if (saveAgentStateFn) saveAgentStateFn();
                if (refreshUIFn) refreshUIFn();
            }
        }
    }
    
    // Ghi đè giao diện Visual Novel
    setTimeout(() => {
        const messageEl = document.querySelector(`#chat .mes[mesid="${messageId}"]`);
        const messageTextEl = document.querySelector(`#chat .mes[mesid="${messageId}"] .mes_text`);
        
        if (messageEl && messageTextEl) {
            if (messageTextEl.querySelector('textarea') || messageTextEl.querySelector('input') || messageEl.classList.contains('editing')) {
                return;
            }
            
            const hasTags = ['thought', 'emotion', 'dialogue', 'action', 'environment', 'sfx'].some(tag => rawText.includes(`<${tag}>`) || rawText.includes(`</${tag}>`));
            if (!hasTags) return; // Do not touch DOM for non-Anima messages!

            messageEl.classList.remove('cog-emotion-anger', 'cog-emotion-happy', 'cog-emotion-sad', 'cog-emotion-fear');
            if (parsed.emotion) {
                messageEl.classList.add(`cog-emotion-${parsed.emotion.toLowerCase().trim()}`);
            }
            
            messageTextEl.innerHTML = getFormattedMessageHtml(rawText, messageId);
        }
    }, 100);
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
                    const hasTags = ['thought', 'emotion', 'dialogue', 'action', 'environment', 'sfx'].some(tag => msgObj.mes.includes(`<${tag}>`) || msgObj.mes.includes(`</${tag}>`));
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
