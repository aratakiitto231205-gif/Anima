// v11.0
import { escapeHtml } from './DashboardUI.js';
import { parseNarrativeXml } from '../utils/xmlParser.js';

export function getFormattedMessageHtml(rawText) {
    const parsed = parseNarrativeXml(rawText);
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
            htmlContent = `<div class="cog-action-caption">${escapeHtml(rawText)}</div>`;
        }
    }

    return htmlContent;
}
