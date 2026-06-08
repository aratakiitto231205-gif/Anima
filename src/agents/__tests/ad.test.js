// src/agents/__tests__/ad.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { ADAgent } from '../ad.js';
import { AnimaState } from '../../core/state.js';

describe('ADAgent Command Handler Tests', () => {
    beforeEach(() => {
        AnimaState.resetToDefault();
    });

    it('should return help message for /help', () => {
        const result = ADAgent.handleUserCommand('/help', AnimaState);
        expect(result.status).toBe('success');
        expect(result.message).toContain('Các lệnh hỗ trợ trong Backstage');
    });

    it('should print physiological status for /status', () => {
        const result = ADAgent.handleUserCommand('/status', AnimaState);
        expect(result.status).toBe('success');
        expect(result.message).toContain('Cảm xúc: Neutral');
    });

    it('should set state properties using set command', () => {
        // Test setting enabled
        const resultEnabled = ADAgent.handleUserCommand('set enabled false', AnimaState);
        expect(resultEnabled.status).toBe('success');
        expect(AnimaState.enabled).toBe(false);

        // Test setting emotion
        const resultEmotion = ADAgent.handleUserCommand('set emotion Excited', AnimaState);
        expect(resultEmotion.status).toBe('success');
        expect(AnimaState.active_emotion).toBe('Excited');

        // Test error handling for invalid keys
        const resultInvalid = ADAgent.handleUserCommand('set invalid_key 10', AnimaState);
        expect(resultInvalid.status).toBe('error');
    });

    it('should reset state using reset', () => {
        AnimaState.enabled = false;
        AnimaState.active_emotion = 'Sad';

        const result = ADAgent.handleUserCommand('reset', AnimaState);
        expect(result.status).toBe('success');
        expect(AnimaState.enabled).toBe(true);
        expect(AnimaState.active_emotion).toBe('Neutral 😐');
    });
});
