// v0.11.0 skeleton — sketch stage
// AD (Assistant Director / Admin) agent: user's command interface for the extension.
// NOT in roleplay session. Handles: config changes, debug, info queries.

/**
 * @typedef {Object} ADCommand
 * @property {'config'|'debug'|'info'|'unknown'} type
 * @property {string} raw - the original command text
 */

/**
 * @typedef {Object} ADOutput
 * @property {string} status - 'ok' | 'no_commands_yet' | 'unknown_command'
 * @property {Object} config_update - partial config to merge
 * @property {string} message - human-readable response
 */

/**
 * @param {Object} input
 * @param {string} input.command - raw user command (e.g., "/anima mood gentler")
 * @param {Object} input.currentConfig - current extension config
 * @returns {Promise<ADOutput>}
 */
export async function handleUserCommand({ command, currentConfig }) {
    // SKETCH: returns 'no_commands_yet'. Real impl will parse slash commands.
    return {
        status: 'no_commands_yet',
        config_update: {},
        message: `skeleton: received command "${command}" but AD not implemented yet`,
    };
}

/**
 * Parse a command string into structured form.
 * @param {string} raw
 * @returns {ADCommand}
 */
export function parseCommand(raw) {
    const trimmed = (raw || '').trim();
    if (!trimmed.startsWith('/')) return { type: 'unknown', raw: trimmed };
    // SKETCH: minimal parse. Real impl handles /anima subcommands.
    return { type: 'info', raw: trimmed };
}
