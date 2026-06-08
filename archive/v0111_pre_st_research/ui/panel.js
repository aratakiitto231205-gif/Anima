// v0.11.0 skeleton — sketch stage
// UI panel: placeholders only. No logic, no live data binding.

/**
 * Render the placeholder panel into a container element.
 * @param {HTMLElement} container
 */
export function renderPanel(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="anima-skeleton-panel" style="padding: 16px; font-family: system-ui, sans-serif;">
            <h2 style="margin: 0 0 8px 0;">Anima Engine — v0.11.0 skeleton</h2>
            <p style="color: #888; margin: 0 0 16px 0;">sketch stage — structure visible, content coming in line/color/detail stages</p>
            <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px;">
                <li>👤 <b>GM agent</b> — orchestrator + planner (src/agents/gm.js)</li>
                <li>✍️ <b>RP agent</b> — writer (src/agents/rp.js)</li>
                <li>🛠️ <b>AD agent</b> — user command interface (src/agents/ad.js)</li>
                <li>🧠 <b>State</b> — in-memory holder (src/core/state.js)</li>
                <li>🔌 <b>Orchestrator</b> — event wiring (src/core/orchestrator.js)</li>
            </ul>
            <p style="margin-top: 16px; color: #aaa; font-size: 12px;">see <code>docs/specs/004_skeleton_v0110.md</code> for next steps</p>
        </div>
    `;
}
