// v0.12.3 — Assistant Director Agent (Backstage Command Handler)
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
                         `- status : Xem trạng thái nhận thức hiện tại.\n` +
                         `- set [key] [val] : Đặt chỉ số (ví dụ: set emotion Excited, set enabled false).\n` +
                         `- reset : Reset các thông số về mặc định.`
            };
        }

        if (mainCommand === '/status' || mainCommand === 'status') {
            return {
                status: 'success',
                message: `Trạng thái nhận thức hiện tại:\n` +
                         `- Trạng thái tác tử: ${state.enabled ? 'Active' : 'Disabled'}\n` +
                         `- Cảm xúc: ${state.active_emotion}\n` +
                         `- Kế hoạch đang kích hoạt: ${state.activePlan ? 'Đã nạp ✓' : 'Trống'}`
            };
        }

        if (mainCommand === '/set' || mainCommand === 'set') {
            const key = parts[1]?.toLowerCase();
            const val = parts.slice(2).join(' ');

            if (!key || !val) {
                return { status: 'error', message: 'Cú pháp lệnh sai. Dùng: set [key] [val]' };
            }

            if (key === 'emotion') {
                state.active_emotion = val;
                logAnima('success', 'AD Agent', `Thiết lập thành công: active_emotion = ${val}`);
                return {
                    status: 'success',
                    message: `Đã cập nhật cảm xúc: ${val}`
                };
            } else if (key === 'enabled') {
                state.enabled = val.toLowerCase() === 'true';
                logAnima('success', 'AD Agent', `Thiết lập thành công: enabled = ${state.enabled}`);
                return {
                    status: 'success',
                    message: `Đã cập nhật trạng thái hoạt động: ${state.enabled}`
                };
            } else {
                return { status: 'error', message: `Không hỗ trợ chỉnh sửa thuộc tính "${key}" ở bản này.` };
            }
        }

        if (mainCommand === '/reset' || mainCommand === 'reset') {
            state.resetToDefault();
            logAnima('success', 'AD Agent', 'Đã reset toàn bộ thông số về mặc định.');
            return {
                status: 'success',
                message: 'Đã thiết lập lại toàn bộ các chỉ số về mặc định.'
            };
        }

        return {
            status: 'unknown',
            message: `Lệnh "${mainCommand}" không xác định. Gõ "help" để xem danh sách lệnh.`
        };
    }
};
