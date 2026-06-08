// v0.12.2 — Assistant Director Agent (Backstage Command Handler)
import { logAnima } from '../utils/logger.js';

export const ADAgent = {
    // Processes user command typed into the Backstage console
    handleUserCommand(commandStr, state) {
        logAnima('info', 'AD Agent', `Đang xử lý lệnh backstage: "${commandStr}"`);

        if (!commandStr || typeof commandStr !== 'string') {
            return { status: 'error', message: 'Lệnh không hợp lệ.' };
        }

        const cmd = commandStr.trim();
        const parts = cmd.split(' ');
        const mainCommand = parts[0].toLowerCase();

        if (mainCommand === '/help' || mainCommand === 'help') {
            return {
                status: 'success',
                message: `Các lệnh hỗ trợ trong Backstage:\n` +
                         `- /status : Xem chi tiết thông số sinh lý hiện tại.\n` +
                         `- /set [key] [val] : Thiết lập nhanh chỉ số (ví dụ: /set energy 10, /set adrenaline 5).\n` +
                         `- /reset : Reset toàn bộ chỉ số về mặc định.\n` +
                         `- /sleep [minutes] : Trực tiếp đưa nhân vật đi ngủ và củng cố ký ức.`
            };
        }

        if (mainCommand === '/status' || mainCommand === 'status') {
            return {
                status: 'success',
                message: `Trạng thái sinh lý hiện tại:\n` +
                         `- Nhịp tim: ${state.vitals.heart_rate} bpm\n` +
                         `- Huyết áp: ${state.vitals.blood_pressure_sys}/${state.vitals.blood_pressure_dia}\n` +
                         `- Năng lượng: ${state.body_status.energy.toFixed(1)}/10.0\n" +
                         "- Cơn đói: ${state.body_status.hunger.toFixed(1)}/10.0\n` +
                         `- Cơn khát: ${state.body_status.thirst.toFixed(1)}/10.0\n` +
                         `- Nhu cầu vệ sinh: ${state.body_status.toilet_need.toFixed(1)}/10.0\n` +
                         `- Cảm xúc đích: ${state.active_emotion}`
            };
        }

        if (mainCommand === '/set' || mainCommand === 'set') {
            const key = parts[1]?.toLowerCase();
            const val = parseFloat(parts[2]);

            if (!key || isNaN(val)) {
                return { status: 'error', message: 'Cú pháp lệnh sai. Dùng: /set [key] [val]' };
            }

            let category = null;
            if (state.body_status[key] !== undefined) {
                state.body_status[key] = Math.min(Math.max(val, 0), 10);
                category = 'body_status';
            } else if (state.hormones[key] !== undefined) {
                state.hormones[key] = Math.min(Math.max(val, 0), 10);
                category = 'hormones';
            } else if (state.vitals[key] !== undefined) {
                state.vitals[key] = Math.round(val);
                category = 'vitals';
            }

            if (category) {
                logAnima('success', 'AD Agent', `Thiết lập thành công: state.${category}.${key} = ${val}`);
                return {
                    status: 'success',
                    config_update: { category, key, val },
                    message: `Đã cập nhật chỉ số: ${key} = ${val}`
                };
            } else {
                return { status: 'error', message: `Không tìm thấy chỉ số nào có tên là "${key}".` };
            }
        }

        if (mainCommand === '/reset' || mainCommand === 'reset') {
            state.resetToDefault();
            logAnima('success', 'AD Agent', 'Đã reset toàn bộ thông số về mặc định.');
            return {
                status: 'success',
                message: 'Đã thiết lập lại toàn bộ các chỉ số sinh học về mặc định.'
            };
        }

        if (mainCommand === '/sleep' || mainCommand === 'sleep') {
            const minutes = parseInt(parts[1]) || 480; // default 8 hours sleep
            state.body_status.energy = 10.0;
            state.hormones.melatonin = 2.0; // Restored
            state.hormones.cortisol = Math.max(state.hormones.cortisol - 2.0, 1.0); // Reduced stress
            
            logAnima('success', 'AD Agent', `Nhân vật đã ngủ ${minutes} phút và thức dậy sảng khoái.`);
            return {
                status: 'success',
                message: `Ngủ thành công: Phục hồi năng lượng về 10.0, giảm nhẹ cortisol căng thẳng.`
            };
        }

        return {
            status: 'unknown',
            message: `Lệnh "${mainCommand}" không xác định. Gõ "help" hoặc "/help" để xem danh sách lệnh.`
        };
    }
};
