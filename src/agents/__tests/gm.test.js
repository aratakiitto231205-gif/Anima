// src/agents/__tests__/gm.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GMAgent } from '../gm.js';
import { LLMClient } from '../../utils/llm.js';

describe('GMAgent Planner Tests', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should generate a valid plan for a fighting/action prompt', async () => {
        const mockChat = [{ role: 'user', mes: 'Ê Itto, đi đấm nhau không?' }];
        const mockState = {};

        const mockResponse = JSON.stringify({
            state_update: {
                active_emotion: 'Phấn khích 🎉🔥',
                environment: {}
            },
            plan: {
                appraisal: 'Người dùng rủ đi đấm nhau, kích hoạt sự hăng hái bẩm sinh của Itto.',
                segments: [{ type: 'dialogue', intent: 'Itto đồng ý!' }]
            }
        });

        vi.spyOn(LLMClient, 'generate').mockResolvedValue(mockResponse);

        const plan = await GMAgent.planAndUpdate(mockChat, mockState, 'Itto');

        expect(plan.plan.appraisal).toContain('đấm nhau');
        expect(plan.state_update.active_emotion).toContain('Phấn khích');
        expect(plan.plan.segments[0].type).toBe('dialogue');
    });

    it('should generate a tired/sleep plan when prompt mentions fatigue', async () => {
        const mockChat = [{ role: 'user', mes: 'Ta buồn ngủ quá, đi ngủ thôi.' }];
        const mockState = {};

        const mockResponse = JSON.stringify({
            state_update: {
                active_emotion: 'Buồn ngủ 😴💤',
                environment: {}
            },
            plan: {
                appraisal: 'Người dùng nhắc đến buồn ngủ',
                segments: [{ type: 'dialogue', intent: 'Đi ngủ thôi' }]
            }
        });

        vi.spyOn(LLMClient, 'generate').mockResolvedValue(mockResponse);

        const plan = await GMAgent.planAndUpdate(mockChat, mockState, 'Itto');

        expect(plan.state_update.active_emotion).toContain('Buồn ngủ');
    });

    it('should return a valid fallback plan when chat history is empty', async () => {
        const plan = await GMAgent.planAndUpdate([], {}, 'Itto');
        expect(plan.plan.appraisal).toBe('Bối cảnh mặc định.');
        expect(plan.plan.segments[0].intent).toBe('Chào hỏi thông thường');
    });

    it('should parse environment updates from keyword triggers', async () => {
        const mockChat = [{ role: 'user', mes: 'Đêm nay đi vào rừng ngắm mưa rơi nhé' }];
        const mockState = {};

        const mockResponse = JSON.stringify({
            state_update: {
                active_emotion: 'Bình thường 😊',
                environment: {
                    location: 'Rừng sâu 🌲',
                    weather: 'Mưa gió tầm tã 🌧️',
                    timeOfDay: 'Ban đêm 🌙'
                }
            },
            plan: {
                appraisal: 'Đi vào rừng xem mưa đêm',
                segments: [{ type: 'dialogue', intent: 'Itto đi ngắm mưa' }]
            }
        });

        vi.spyOn(LLMClient, 'generate').mockResolvedValue(mockResponse);

        const plan = await GMAgent.planAndUpdate(mockChat, mockState, 'Itto');

        expect(plan.state_update.environment.location).toBe('Rừng sâu 🌲');
        expect(plan.state_update.environment.weather).toBe('Mưa gió tầm tã 🌧️');
        expect(plan.state_update.environment.timeOfDay).toBe('Ban đêm 🌙');
    });
});
