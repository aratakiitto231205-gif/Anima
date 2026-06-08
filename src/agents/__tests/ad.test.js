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
        expect(result.message).toContain('Nhịp tim: 75 bpm');
    });

    it('should set state properties using /set command', () => {
        // Test setting a body status property
        const resultBody = ADAgent.handleUserCommand('/set energy 4.5', AnimaState);
        expect(resultBody.status).toBe('success');
        expect(AnimaState.body_status.energy).toBe(4.5);

        // Test setting a hormone level
        const resultHormone = ADAgent.handleUserCommand('/set adrenaline 6.8', AnimaState);
        expect(resultHormone.status).toBe('success');
        expect(AnimaState.hormones.adrenaline).toBe(6.8);

        // Test error handling for invalid keys
        const resultInvalid = ADAgent.handleUserCommand('/set invalid_key 10', AnimaState);
        expect(resultInvalid.status).toBe('error');
    });

    it('should reset state using /reset', () => {
        AnimaState.body_status.energy = 2.0;
        AnimaState.vitals.heart_rate = 120;

        const result = ADAgent.handleUserCommand('/reset', AnimaState);
        expect(result.status).toBe('success');
        expect(AnimaState.body_status.energy).toBe(10.0);
        expect(AnimaState.vitals.heart_rate).toBe(75);
    });

    it('should trigger sleep correctly using /sleep', () => {
        AnimaState.body_status.energy = 1.0;
        AnimaState.hormones.cortisol = 8.0;

        const result = ADAgent.handleUserCommand('/sleep 120', AnimaState);
        expect(result.status).toBe('success');
        expect(AnimaState.body_status.energy).toBe(10.0);
        expect(AnimaState.hormones.cortisol).toBe(6.0); // Cortisol decreases
    });
});
