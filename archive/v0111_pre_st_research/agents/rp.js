// v0.11.0 skeleton — sketch stage
// RP (Role-Play) agent: writer. Receives plan + style → outputs prose with tags.
// Does NOT plan. Does NOT call tools. Does NOT update state.

/**
 * @param {Object} input
 * @param {import('./gm.js').Plan} input.plan - from GM
 * @param {string} input.characterStyle - persona/style description (from character card)
 * @param {string[]} input.chatExample - few-shot examples (from character card)
 * @param {Array} input.recalledMemories - from GM
 * @param {Object} input.state - current state (for context only)
 * @param {Function} input.llmCall - async (prompt) => string, abstracted for testing
 * @returns {Promise<{prose: string, segments: Array<{id: number, text: string, tags_parsed: Object}>}>}
 */
export async function writeProse({ plan, characterStyle, chatExample, recalledMemories, state, llmCall }) {
    // SKETCH: returns placeholder prose. Real impl will call LLM segment-by-segment.
    const segments = plan.segments.map((seg) => ({
        id: seg.id,
        text: `[sketch: ${seg.type}]`,
        tags_parsed: { type: seg.type, intent: seg.intent },
    }));
    return { prose: segments.map((s) => s.text).join(' '), segments };
}
