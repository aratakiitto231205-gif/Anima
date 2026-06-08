// v0.11.0 skeleton — sketch stage
// GM (Game Master) agent: orchestrator, planner, state updater.
// Does NOT write prose. Does NOT generate tool calls itself.
// Returns: appraisal + state_update + recalled_memories + exact plan + next_action.

/**
 * @typedef {Object} PlanSegment
 * @property {number} id - segment order (1-indexed)
 * @property {'internal_thought'|'action'|'dialogue'|'environment'|'sfx'} type
 * @property {[number, number]} length_words - [min, max] word count
 * @property {string} intent - what this segment should convey
 * @property {string[]} tags - which XML tags to use: animaing, emotion, action, dialogue, environment, sfx
 */

/**
 * @typedef {Object} Plan
 * @property {PlanSegment[]} segments
 * @property {string} rationale - why this plan, in 1 sentence
 */

/**
 * @typedef {Object} GMOutput
 * @property {{relevance: number, goal_congruence: number, coping: number, norms: number}} appraisal
 * @property {Object} state_update - hormone/body/env deltas to apply
 * @property {Array<{id: string, content: string, weight: number}>} recalled_memories
 * @property {Plan} plan
 * @property {'normal'|'reflect'|'remember'|'plan'|'sleep'} next_action
 */

/**
 * @param {Object} input
 * @param {string} input.userMessage
 * @param {Array} input.chat - full chat history
 * @param {Object} input.state - current agent state
 * @param {Object} input.agent - CognitiveAgent instance (later: stub for sketch)
 * @returns {Promise<GMOutput>}
 */
export async function planAndUpdate({ userMessage, chat, state, agent }) {
    // SKETCH: returns minimal valid shape. Real impl will call LLM (Sonnet/GPT-4 class).
    return {
        appraisal: { relevance: 0.5, goal_congruence: 0.5, coping: 0.5, norms: 0.5 },
        state_update: {},
        recalled_memories: [],
        plan: {
            segments: [
                {
                    id: 1,
                    type: 'dialogue',
                    length_words: [5, 20],
                    intent: 'respond naturally to user',
                    tags: ['animaing', 'emotion', 'dialogue'],
                },
            ],
            rationale: 'skeleton: minimal 1-segment response',
        },
        next_action: 'normal',
    };
}
