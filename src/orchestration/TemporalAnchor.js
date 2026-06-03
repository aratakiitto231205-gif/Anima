/**
 * TemporalAnchor - Xử lý ngữ cảnh thời gian (thời điểm trong ngày, thời gian đã trôi qua)
 */

export function applyTemporalAnchor(agent, chat) {
    if (!agent || !chat) return;

    const lastUserMsgIndex = chat.map(m =>
        m && (m.is_user || (m.role && m.role.toLowerCase() === 'user'))
    ).lastIndexOf(true);

    if (lastUserMsgIndex !== -1) {
        agent.memory.applyTemporalAnchor(lastUserMsgIndex, agent.hormones, agent.neuro_history);
        agent.updateDynamicMentalState();
    }
}

export function applyTemporalAnchorFromChatLog(agent, chatLog) {
    if (!agent || !chatLog) return;

    const lastUserMsgIndex = chatLog.map(m => m.is_user).lastIndexOf(true);

    if (lastUserMsgIndex !== -1) {
        agent.memory.applyTemporalAnchor(lastUserMsgIndex, agent.hormones, agent.neuro_history);
        agent.updateDynamicMentalState();
    }
}

export function getLastUserMessage(chat) {
    if (!chat || chat.length === 0) return '';
    const userMsgs = chat.filter(msg =>
        msg && (msg.is_user || (msg.role && msg.role.toLowerCase() === 'user'))
    );
    if (userMsgs.length === 0) return '';
    const last = userMsgs[userMsgs.length - 1];
    return last.mes || last.content || '';
}
