// v0.11.0 skeleton — sketch stage
import { describe, it, expect } from 'vitest';
import { parseCommand, handleUserCommand } from '../ad.js';

describe('AD contract (skeleton)', () => {
    describe('parseCommand', () => {
        it('returns unknown type for non-slash input', () => {
            expect(parseCommand('hello').type).toBe('unknown');
        });

        it('returns info type for slash command (sketch placeholder)', () => {
            expect(parseCommand('/anima info').type).toBe('info');
        });
    });

    describe('handleUserCommand', () => {
        it('returns status = no_commands_yet (skeleton)', async () => {
            const out = await handleUserCommand({ command: '/anima anything', currentConfig: {} });
            expect(out.status).toBe('no_commands_yet');
            expect(out).toHaveProperty('config_update');
            expect(out).toHaveProperty('message');
        });
    });
});
