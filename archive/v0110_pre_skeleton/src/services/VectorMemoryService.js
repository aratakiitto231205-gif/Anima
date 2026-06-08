/**
 * VectorMemoryService.js - v0.11.0 (Vector DB & Semantic Recall Service)
 *
 * Quản lý đồng bộ hóa và tìm kiếm ngữ nghĩa các thẻ ký ức với Vector DB của SillyTavern.
 */

import { logAnima } from '../utils/logger.js';

export async function syncVectorMemoryCard(characterId, card, action = 'insert') {
    // SillyTavern là đối tượng toàn cục trong ngữ cảnh extension của ST
    if (typeof SillyTavern === 'undefined') return;
    const context = SillyTavern.getContext();
    if (!context || !context.extension_settings?.vectors?.enabled_chats) return;

    try {
        await fetch('/api/extensions/vectors/sync_card', {
            method: 'POST',
            headers: context.getRequestHeaders(),
            body: JSON.stringify({
                characterId,
                cardId: card.id,
                content: card.content,
                action,
                metadata: {
                    weight: card.weight,
                    emotions: card.emotions,
                    timestamp: card.timestamp,
                },
            }),
        });
    } catch (e) {
        logAnima('warning', 'VectorMemory', `Failed to sync vector card: ${e.message}`);
    }
}

export async function recallMemoriesSemantic(characterId, text, limit = 3, minScore = 0.2) {
    if (typeof SillyTavern === 'undefined') return [];
    const context = SillyTavern.getContext();
    if (!context || !context.extension_settings?.vectors?.enabled_chats) return [];

    try {
        const response = await fetch('/api/extensions/vectors/search', {
            method: 'POST',
            headers: context.getRequestHeaders(),
            body: JSON.stringify({ characterId, text, limit, minScore }),
        });
        if (response.ok) {
            const data = await response.json();
            return (data.results || []).map((r) => r.card);
        }
    } catch (e) {
        logAnima('warning', 'VectorMemory', `Semantic search failed: ${e.message}`);
    }
    return [];
}
