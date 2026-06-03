/**
 * DashboardUI.js - v10.0 (Modularized UI Synchronizer)
 * 
 * Quản lý đồng bộ trạng thái nhận thức và sinh lý của tác tử lên giao diện HTML,
 * xử lý hoạt họa nhịp tim, các thanh đo hormone neon, và danh sách nhật ký nhận thức.
 */

export function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function refreshMemoryUI(agent, activeEnvironment, saveAgentStateFn) {
    if (!agent) return;
    
    // 1. Cập nhật các chỉ số sinh tồn lâm sàng (Vital Signs)
    const hrEl = document.getElementById('cog_vital_heart_rate');
    if (hrEl) {
        hrEl.innerText = `${agent.vitals.heart_rate} bpm`;
        
        // Cập nhật hoạt họa đập tim dựa theo tốc độ nhịp tim
        const heartIcon = document.getElementById('cog_heart_icon');
        if (heartIcon) {
            const duration = Math.max(0.3, 60 / agent.vitals.heart_rate);
            heartIcon.style.animationDuration = `${duration}s`;
        }
    }
    
    const bpEl = document.getElementById('cog_vital_blood_pressure');
    if (bpEl) {
        bpEl.innerText = `${agent.vitals.blood_pressure_sys}/${agent.vitals.blood_pressure_dia}`;
    }
    
    const tempEl = document.getElementById('cog_vital_body_temp');
    if (tempEl) {
        tempEl.innerText = `${agent.vitals.body_temp.toFixed(1)}°C`;
    }
    
    const respEl = document.getElementById('cog_vital_resp_rate');
    if (respEl) {
        respEl.innerText = `${agent.vitals.resp_rate}/m`;
    }
    
    // 2. Cập nhật Thể Trạng (Somatosensory bars)
    const sensKeys = ['energy', 'pain', 'hunger', 'thirst', 'toilet_need', 'nausea'];
    sensKeys.forEach(k => {
        const valEl = document.getElementById(`cog_sens_${k}`);
        const barEl = document.getElementById(`cog_bar_${k}`);
        if (valEl && barEl) {
            const val = agent.body_status[k];
            valEl.innerText = val.toFixed(1);
            barEl.style.width = `${val * 10}%`;
            
            // Đổi màu thanh đo dựa trên mức độ nguy hại
            if (k === 'energy') {
                barEl.style.background = val < 3.0 
                    ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                    : 'linear-gradient(90deg, #10b981, #34d399)';
            } else if (k === 'pain' || k === 'nausea' || k === 'toilet_need') {
                barEl.style.background = val > 6.0 
                    ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                    : (k === 'pain' ? 'linear-gradient(90deg, #f87171, #f43f5e)' : 'linear-gradient(90deg, #fbbf24, #f59e0b)');
            }
        }
    });

    const tempSensEl = document.getElementById('cog_sens_temp');
    if (tempSensEl) {
        tempSensEl.innerText = agent.body_status.temp_sensation || 'Bình thường 🧘';
    }

    // 3. Cập nhật Hormones
    const hormones = agent.hormones.levels;
    Object.keys(hormones).forEach(k => {
        const valEl = document.getElementById(`cog_val_${k}`);
        const barEl = document.getElementById(`cog_bar_${k}`);
        if (valEl && barEl) {
            const val = hormones[k];
            valEl.innerText = val.toFixed(1);
            barEl.style.width = `${val * 10}%`;
        }
    });

    // 4. Cập nhật Trạng thái Tâm lý và Thể chất
    const psychEl = document.getElementById('cog_dash_psych');
    if (psychEl) {
        psychEl.innerText = agent.mental_state || 'Cân bằng / Yên bình 😐';
    }

    const bodyTextEl = document.getElementById('cog_db_body');
    if (bodyTextEl && document.activeElement !== bodyTextEl) {
        bodyTextEl.value = agent.body || 'Bình thường, khỏe mạnh.';
    }

    // Render beliefs list
    const beliefsListEl = document.getElementById('cog_db_beliefs_list');
    if (beliefsListEl) {
        if (agent.memory.beliefs && agent.memory.beliefs.length > 0) {
            beliefsListEl.innerHTML = agent.memory.beliefs.map(b => 
                `<div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 4px 8px; font-size: 0.82em; display:flex; justify-content:space-between; align-items:center;">
                    <span>🛡️ ${escapeHtml(b.content)}</span>
                    <button class="cog-del-belief" data-id="${b.id}" style="background:transparent; border:none; color:#f87171; cursor:pointer; font-size: 0.9em;">×</button>
                </div>`
            ).join('');
            
            beliefsListEl.querySelectorAll('.cog-del-belief').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    agent.memory.beliefs = agent.memory.beliefs.filter(b => b.id !== id);
                    if (saveAgentStateFn) saveAgentStateFn();
                    refreshMemoryUI(agent, activeEnvironment, saveAgentStateFn);
                });
            });
        } else {
            beliefsListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Chưa có niềm tin cốt lõi nào...</i>`;
        }
    }

    // Render Core Memories list
    const coreListEl = document.getElementById('cog_db_core_list');
    if (coreListEl) {
        if (agent.memory.recallable_drawer && agent.memory.recallable_drawer.length > 0) {
            const cores = agent.memory.recallable_drawer.filter(m => m.weight >= 7.0);
            if (cores.length > 0) {
                coreListEl.innerHTML = cores.map(c => 
                    `<div style="background: rgba(168,85,247,0.05); border: 1px solid rgba(168,85,247,0.15); border-radius: 4px; padding: 4px 8px; font-size: 0.82em;">
                        🧠 <b>[Core W:${c.weight.toFixed(1)}]</b>: ${escapeHtml(c.content)}
                    </div>`
                ).join('');
            } else {
                coreListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Chưa có ký ức cốt lõi nổi bật (Weight >= 7.0)...</i>`;
            }
        } else {
            coreListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Chưa học được bài học nào.</i>`;
        }
    }

    // Render Drawer (Long term Drawer list)
    const drawerListEl = document.getElementById('cog_db_drawer_list');
    if (drawerListEl) {
        if (agent.memory.recallable_drawer && agent.memory.recallable_drawer.length > 0) {
            drawerListEl.innerHTML = agent.memory.recallable_drawer.map(c => {
                const dateStr = new Date(c.timestamp).toLocaleDateString();
                return `<div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 6px; font-size: 0.82em; display:flex; justify-content:space-between; flex-direction:column; gap:2px;">
                    <span style="color:#cbd5e1;">📌 ${escapeHtml(c.content)}</span>
                    <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#64748b; margin-top:2px;">
                        <span>Trọng số: ${c.weight.toFixed(1)} | Lặp: ${c.count}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>`;
            }).join('');
        } else {
            drawerListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Ngăn kéo trống, chưa học ký ức...</i>`;
        }
    }

    // Render Amygdala triggers
    const triggersListEl = document.getElementById('cog_db_triggers_list');
    if (triggersListEl) {
        if (agent.biomarker_triggers && agent.biomarker_triggers.length > 0) {
            triggersListEl.innerHTML = agent.biomarker_triggers.map(t => 
                `<div style="background: rgba(244,63,94,0.05); border: 1px solid rgba(244,63,94,0.15); border-radius: 4px; padding: 4px 8px; font-size: 0.82em;">
                    ⚡ <b>[Trigger: ${escapeHtml(t.keyword)}]</b>: ${escapeHtml(t.effect)}
                </div>`
            ).join('');
        } else {
            triggersListEl.innerHTML = `<i style="color: #64748b; font-size: 0.8em;">Chưa học được phản xạ tùy biến nào...</i>`;
        }
    }

    // 5. Đồng bộ môi trường vật lý
    refreshEnvironmentUI(activeEnvironment);
}

export function refreshEnvironmentUI(activeEnvironment) {
    if (!activeEnvironment) return;
    
    const labelEl = document.getElementById('cog_active_location_label');
    const descEl = document.getElementById('cog_active_location_desc');
    const itemsEl = document.getElementById('cog_active_location_items');
    
    const activeLocName = activeEnvironment.active_location || "Chưa rõ";
    if (labelEl) labelEl.innerText = activeLocName;
    
    const activeLoc = activeEnvironment.locations && activeEnvironment.locations[activeLocName];
    if (activeLoc) {
        if (descEl) descEl.innerText = activeLoc.description || "Chưa có mô tả địa điểm...";
        
        if (itemsEl) {
            const items = activeLoc.items || [];
            if (items.length > 0) {
                itemsEl.innerHTML = items.map(item => {
                    const qtyBadge = item.quantity > 1 ? `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 1px 4px; border-radius: 3px; font-size: 0.85em; font-weight: bold; margin-left: 4px;">x${item.quantity}</span>` : '';
                    return `<div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 4px; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span>📦 <b>${escapeHtml(item.name)}</b>${qtyBadge}</span>
                        <span style="color: #94a3b8; font-size: 0.9em; font-style: italic;">${escapeHtml(item.state || 'Bình thường')}</span>
                    </div>`;
                }).join('');
            } else {
                itemsEl.innerHTML = `<i style="color: #64748b;">Không có vật phẩm nào ở địa điểm này.</i>`;
            }
        }
    } else {
        if (descEl) descEl.innerText = "Chưa có mô tả địa điểm...";
        if (itemsEl) itemsEl.innerHTML = `<i style="color: #64748b;">Không có vật phẩm.</i>`;
    }
}

export function updateActiveRecallUI(activeRecalledMemories) {
    const activeRecallEl = document.getElementById('cog_dash_active_recall');
    if (!activeRecallEl) return;
    
    if (activeRecalledMemories && activeRecalledMemories.length > 0) {
        activeRecallEl.innerHTML = activeRecalledMemories.map(m => 
            `<div style="margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:4px;">
                <span style="color:#eab308; font-weight:bold;">💡 Ký ức:</span>
                <span style="color:#cbd5e1;">"${escapeHtml(m.content)}"</span>
            </div>`
        ).join('');
    } else {
        activeRecallEl.innerHTML = `<i style="color: #64748b;">Đầu óc trống rỗng, không liên tưởng gì...</i>`;
    }
}

export function appendLogToUi(log) {
    const container = document.getElementById('cog_logs_container');
    if (!container) return;
    
    const levelColors = {
        'INFO': '#94a3b8',
        'SUCCESS': '#10b981',
        'WARNING': '#fbbf24',
        'ERROR': '#fca5a5',
        'COGNITIVE': '#c084fc'
    };
    
    const color = levelColors[log.level] || '#cbd5e1';
    const logDiv = document.createElement('div');
    logDiv.style.marginBottom = '4px';
    logDiv.style.borderBottom = '1px solid rgba(255, 255, 255, 0.02)';
    logDiv.style.paddingBottom = '2px';
    
    let detailText = '';
    if (log.detail) {
        detailText = `\n  <span style="color: #64748b; font-size: 0.9em;">→ ${escapeHtml(log.detail)}</span>`;
    }
    
    logDiv.innerHTML = `
        <span style="color: #64748b;">[${log.time}]</span> 
        <span style="color: ${color}; font-weight: bold;">[${log.level}]</span> 
        <span style="color: #38bdf8;">[${log.module}]</span> 
        <span style="color: #e2e8f0;">${escapeHtml(log.message)}</span>${detailText}
    `;
    
    container.appendChild(logDiv);
    container.scrollTop = container.scrollHeight;
}
