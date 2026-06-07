// v11.0
import { appendLogToUi } from '../ui/DashboardUI.js';

const MAX_LOG_SIZE = 150;
let animaLogs = [];

try {
    const savedLogs = sessionStorage.getItem('anima_engine_session_logs');
    if (savedLogs) {
        animaLogs = JSON.parse(savedLogs);
    }
} catch (e) {
    console.warn('Anima Logger: Failed to load session logs:', e);
}

export function logAnima(level, moduleName, message, detail = null) {
    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString();

    const logEntry = {
        time: timeStr,
        level: level.toUpperCase(),
        module: moduleName,
        message: message,
        detail: detail ? (typeof detail === 'object' ? JSON.stringify(detail) : String(detail)) : null,
    };

    animaLogs.push(logEntry);
    if (animaLogs.length > MAX_LOG_SIZE) {
        animaLogs.shift();
    }

    try {
        sessionStorage.setItem('anima_engine_session_logs', JSON.stringify(animaLogs));
    } catch {
        // Session storage update failed, fail silently
    }

    const colors = {
        INFO: 'color: #94a3b8;',
        SUCCESS: 'color: #10b981; font-weight: bold;',
        WARNING: 'color: #f59e0b; font-weight: bold;',
        ERROR: 'color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.1);',
        COGNITIVE: 'color: #a855f7; font-weight: bold;',
    };

    const consoleColor = colors[logEntry.level] || 'color: #cbd5e1;';
    console.log(
        `%c[Anima Engine - ${logEntry.level}]%c [${logEntry.module}] ${logEntry.message}`,
        `${consoleColor}`,
        'color: unset;',
        detail || ''
    );

    appendLogToUi(logEntry);
}

export function refreshLogsUi() {
    const container = document.getElementById('cog_logs_container');
    if (!container) return;
    container.innerHTML = '';
    animaLogs.forEach((log) => appendLogToUi(log));
}

export function clearAnimaLogs() {
    animaLogs = [];
    try {
        sessionStorage.removeItem('anima_engine_session_logs');
    } catch {
        // Session storage remove failed, fail silently
    }
    refreshLogsUi();
    logAnima('success', 'Logger', 'Đã làm sạch nhật ký nhận thức.');
}

export function getAnimaLogsText() {
    return animaLogs
        .map((log) => {
            const detail = log.detail ? `\n   ${log.detail}` : '';
            return `[${log.time}] [${log.level}] [${log.module}] ${log.message}${detail}`;
        })
        .join('\n');
}

export async function copyAnimaLogsToClipboard() {
    const text = getAnimaLogsText();
    if (!text) {
        if (typeof toastr !== 'undefined') toastr.warning('Nhật ký trống, không có gì để sao chép.');
        return;
    }
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback: dùng textarea tạm + execCommand
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        if (typeof toastr !== 'undefined') toastr.success(`Đã sao chép ${animaLogs.length} dòng nhật ký.`);
        logAnima('success', 'Logger', `Đã sao chép ${animaLogs.length} dòng nhật ký vào clipboard.`);
    } catch (err) {
        console.error('Anima Logger: Copy failed', err);
        if (typeof toastr !== 'undefined') toastr.error('Sao chép thất bại: ' + err.message);
    }
}

export function downloadAnimaLogsAsFile() {
    const text = getAnimaLogsText();
    if (!text) {
        if (typeof toastr !== 'undefined') toastr.warning('Nhật ký trống, không có gì để tải.');
        return;
    }
    try {
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `anima-logs-${dateStr}.txt`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (typeof toastr !== 'undefined') toastr.success(`Đã tải ${animaLogs.length} dòng nhật ký (${filename}).`);
        logAnima('success', 'Logger', `Đã tải nhật ký về máy: ${filename}`);
    } catch (err) {
        console.error('Anima Logger: Download failed', err);
        if (typeof toastr !== 'undefined') toastr.error('Tải thất bại: ' + err.message);
    }
}
