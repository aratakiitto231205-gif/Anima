/**
 * CognitiveAgent.js - v10.0 (Modularized Cognitive Brain Aggregator)
 * 
 * Bộ tổng hợp (Aggregator) lõi kết nối tất cả các động cơ nhận thức con:
 * HormoneEngine, MemoryEngine, ConsciousnessEngine.
 * Đồng thời quản lý Vitals, Somatosensory, và các chu kỳ biến đổi thể trạng theo thời gian thực.
 */

import { HormoneEngine } from './HormoneEngine.js';
import { MemoryEngine } from './MemoryEngine.js';
import { ConsciousnessEngine } from './ConsciousnessEngine.js';

export class CognitiveAgent {
    constructor(saveState = null) {
        const memoryData = saveState || null;
        
        // Tích hợp Đa hình di truyền baseline cá tính nhân vật
        this.genetics = memoryData?.genetics || {
            comt: 'Val/Met',                 // Warrior (Val/Val) vs Worrier (Met/Met)
            serotonin_transporter: 'S/L',    // Kháng stress nhạy cảm (S/S) vs phục hồi nhanh (L/L)
            oxtr: 'A/G',                     // Trơ lì xã hội (A/A) vs đồng cảm cao (G/G)
            drd4: '7R-'                      // Khao khát Novelty Seeking (7R+) vs thói quen ổn định (7R-)
        };

        this.hormones = new HormoneEngine(memoryData?.neuro_chemistry);
        this.memory = new MemoryEngine(memoryData, this.genetics);
        this.consciousness = new ConsciousnessEngine(memoryData?.config);
        
        this.body = memoryData?.body || 'Bình thường, khỏe mạnh.';
        
        // Tái cấu trúc Trục Thể chất Lâm sàng (Somatosensory Axis) v8.2
        this.body_status = memoryData?.body_status || {
            energy: 10.0,
            pain: 0.0,
            hunger: 0.0,
            thirst: 0.0,
            toilet_need: 0.0,
            nausea: 0.0,
            dyspnea: 0.0,
            temp_sensation: 'Bình thường'
        };

        // Di chuyển dữ liệu cũ từ bladder sang toilet_need nếu có
        if (memoryData?.body_status?.bladder !== undefined && this.body_status.toilet_need === undefined) {
            this.body_status.toilet_need = memoryData.body_status.bladder;
            delete this.body_status.bladder;
        }

        // Các chỉ số sinh tồn lâm sàng (Vital Signs)
        this.vitals = memoryData?.vitals || {
            heart_rate: 75,
            blood_pressure_sys: 120,
            blood_pressure_dia: 80,
            body_temp: 36.8,
            resp_rate: 16
        };

        this.mental_state = memoryData?.mental_state || 'Cân bằng / Yên bình 😐';
        this.last_update_timestamp = memoryData?.last_update_timestamp || new Date().toISOString();
        
        // Bảo tồn các trường đặc trưng SillyTavern
        this.personality = memoryData?.personality || {
            forgetting: 5,
            sensitivity: 5,
            healing: 5,
            habit_threshold: 3
        };
        
        // Cập nhật ngưỡng tạo thói quen dựa trên DRD4 di truyền học
        if (this.genetics.drd4 === '7R+') {
            this.personality.habit_threshold = 5;
        }

        this.biomarker_triggers = memoryData?.biomarker_triggers || [];
        this.neuro_history = memoryData?.neuro_history || {};
    }

    // AI trực tiếp cập nhật các chỉ số sinh lý lâm sàng tự trị qua thẻ XML (loại bỏ máy móc cồng kềnh)
    updateVitalsAndSensations(updates) {
        if (!updates) return;
        for (const [key, val] of Object.entries(updates)) {
            const k = key.toLowerCase().trim();
            if (this.body_status[k] !== undefined) {
                if (typeof this.body_status[k] === 'number') {
                    this.body_status[k] = Math.min(Math.max(parseFloat(val), 0.0), 10.0);
                } else {
                    this.body_status[k] = val; // Temp sensation string
                }
            } else if (this.vitals[k] !== undefined) {
                this.vitals[k] = parseFloat(val);
            } else if (k === 'blood_pressure_sys') {
                this.vitals.blood_pressure_sys = parseInt(val);
            } else if (k === 'blood_pressure_dia') {
                this.vitals.blood_pressure_dia = parseInt(val);
            } else if (k === 'injury' || k === 'body') {
                this.body = val; // Lưu mô tả vết thương tự trị của AI
            }
        }
        this.updateDynamicMentalState();
    }

    // Tự động điều tiết các cảm giác sinh lý theo thời gian trôi qua thực tế
    tickPhysicalSensations(elapsedMinutes, isSleeping = false) {
        if (elapsedMinutes <= 0) return;
        if (isSleeping) {
            // Đang ngủ: Phục hồi năng lượng chậm rãi, đói khát tăng cực chậm, tích tụ nhu cầu vệ sinh êm dịu
            this.body_status.energy = Math.min(this.body_status.energy + elapsedMinutes * 0.05, 10.0);
            this.body_status.hunger = Math.min(this.body_status.hunger + elapsedMinutes * 0.002, 10.0);
            this.body_status.thirst = Math.min(this.body_status.thirst + elapsedMinutes * 0.003, 10.0);
            this.body_status.toilet_need = Math.min(this.body_status.toilet_need + elapsedMinutes * 0.007, 10.0);
        } else {
            // Đang thức: Tiêu hao năng lượng dịu nhẹ, tăng đói, khát, tích tụ nhu cầu vệ sinh êm ái
            this.body_status.energy = Math.max(this.body_status.energy - elapsedMinutes * 0.004, 0.0);
            this.body_status.hunger = Math.min(this.body_status.hunger + elapsedMinutes * 0.003, 10.0);
            this.body_status.thirst = Math.min(this.body_status.thirst + elapsedMinutes * 0.004, 10.0);
            this.body_status.toilet_need = Math.min(this.body_status.toilet_need + elapsedMinutes * 0.005, 10.0);
        }

        // Cảm giác khó thở (dyspnea) tự giảm dần nếu tim đập không quá nhanh
        if (this.vitals.heart_rate < 100) {
            this.body_status.dyspnea = Math.max(this.body_status.dyspnea - elapsedMinutes * 0.08, 0.0);
        }
        
        // Buồn nôn (nausea) tự phục hồi chầm chậm về 0
        this.body_status.nausea = Math.max(this.body_status.nausea - elapsedMinutes * 0.04, 0.0);

        // Cơn đau (pain) giảm cực kỳ chậm nếu không có tác động từ ngoài
        this.body_status.pain = Math.max(this.body_status.pain - elapsedMinutes * 0.005, 0.0);
    }

    processMessage(text, role, currentMessageIndex) {
        const lastTime = new Date(this.last_update_timestamp).getTime();
        const elapsedMinutes = (Date.now() - lastTime) / 60000;

        // 1. Phân rã sinh học thời gian thực
        this.hormones.decay(elapsedMinutes, this.body, this.genetics);
        
        // 2. Phân rã trí nhớ ngắn hạn theo Ebbinghaus
        this.memory.decayShortTermMemory(elapsedMinutes);

        // 3. Khôi phục sinh hóa ngược dòng thời gian (không xóa future memories)
        this.memory.applyTemporalAnchor(currentMessageIndex, this.hormones, this.neuro_history);

        // 4. Tách biệt ticks thể chất tự nhiên
        const isSleeping = this.hormones.levels.melatonin >= 8.0;
        this.tickPhysicalSensations(elapsedMinutes, isSleeping);

        // 5. Cập nhật Trạng thái Tinh thần động
        this.updateDynamicMentalState();

        this.last_update_timestamp = new Date().toISOString();

        // 6. Đóng dấu lịch sử trạng thái sinh hóa
        if (currentMessageIndex !== undefined && currentMessageIndex !== null) {
            this.neuro_history[currentMessageIndex] = { ...this.hormones.levels };
        }

        return []; // Gợi nhớ sẽ chạy bằng Vector Search không đồng bộ
    }

    updateDynamicMentalState() {
        if (this.memory.in_crisis) {
            this.mental_state = "Khủng hoảng Nhận thức (Hệ niềm tin vỡ vụn) ⚠️";
            return;
        }

        const levels = this.hormones.levels;
        const da = levels.dopamine;
        const se = levels.serotonin;
        const ad = levels.adrenaline;
        const co = levels.cortisol;
        const ox = levels.oxytocin;
        const sh = levels.sex_hormones;
        const en = levels.endorphins;

        // Vòng lặp Hồi đáp Hữu cơ (Circadian Somatosensory Loop) v7.0 y học lâm sàng thực tế
        const pain = this.body_status.pain || 0.0;
        const dyspnea = this.body_status.dyspnea || 0.0;
        const mel = levels.melatonin || 2.0;

        // 1. Nhịp tim (Heart Rate): baseline 70, ADR tăng +6/đơn vị, pain +3, dyspnea +4, melatonin giảm -2.5
        this.vitals.heart_rate = Math.round(70 + (ad * 6.5) + (pain * 3.5) + (dyspnea * 4.0) - (mel * 2.0));
        this.vitals.heart_rate = Math.min(Math.max(this.vitals.heart_rate, 50), 180);

        // 2. Huyết áp (Blood Pressure):
        // Huyết áp tâm thu (Systolic): normal 115, cortisol +4/đơn vị, adrenaline +3, pain +2, melatonin giảm -1.5
        this.vitals.blood_pressure_sys = Math.round(115 + (co * 4.0) + (ad * 3.0) + (pain * 2.0) - (mel * 1.5));
        this.vitals.blood_pressure_sys = Math.min(Math.max(this.vitals.blood_pressure_sys, 85), 190);

        // Huyết áp tâm trương (Diastolic): normal 75, cortisol +2.5, adrenaline +2, pain +1, melatonin giảm -1.0
        this.vitals.blood_pressure_dia = Math.round(75 + (co * 2.5) + (ad * 2.0) + (pain * 1.0) - (mel * 1.0));
        this.vitals.blood_pressure_dia = Math.min(Math.max(this.vitals.blood_pressure_dia, 55), 115);

        // 3. Nhịp thở (Respiratory Rate): normal 14, ADR +1.2, dyspnea +1.5, pain +0.5, melatonin giảm -0.8
        this.vitals.resp_rate = Math.round(14 + (ad * 1.2) + (dyspnea * 1.5) + (pain * 0.5) - (mel * 0.8));
        this.vitals.resp_rate = Math.min(Math.max(this.vitals.resp_rate, 8), 32);

        // 4. Thân nhiệt (Body Temperature): normal 36.8°C, tăng khi viêm/đau (pain * 0.15), stress nhẹ (ad * 0.08), giảm khi melatonin/ngủ (mel * -0.05)
        this.vitals.body_temp = parseFloat((36.5 + (pain * 0.15) + (ad * 0.08) - (mel * 0.05)).toFixed(1));
        this.vitals.body_temp = Math.min(Math.max(this.vitals.body_temp, 35.0), 40.5);

        // Cập nhật cảm giác nhiệt tương ứng y học
        if (this.vitals.body_temp >= 38.5) {
            this.body_status.temp_sensation = 'Sốt cao / Nóng bức 🥵';
        } else if (this.vitals.body_temp >= 37.5) {
            this.body_status.temp_sensation = 'Sốt nhẹ / Ấm nóng 🌡️';
        } else if (this.vitals.body_temp <= 36.0) {
            this.body_status.temp_sensation = 'Lạnh giá / Hạ thân nhiệt 🥶';
        } else {
            this.body_status.temp_sensation = 'Bình thường 🧘';
        }

        // Định nghĩa các ngưỡng nhạy cảm sinh học dựa trên baseline thực tế
        const isDaHigh = da >= 6.5;
        const isDaLow = da < 4.0;
        const isSeHigh = se >= 6.5;
        const isSeLow = se < 4.0;
        const isAdHigh = ad >= 4.5;
        const isAdLow = ad < 2.5;
        const isCoHigh = co >= 5.0;
        const isOxHigh = ox >= 6.5;
        const isOxLow = ox < 4.0;

        // Phân cấp sắc thái tinh tế (Nuanced Emotion Spectrum)
        
        // 1. Phân biệt Buồn bã Đồng cảm vs. Thất vọng
        if (isCoHigh) {
            if (isOxHigh) {
                this.mental_state = "Buồn bã Đồng cảm (Đau lòng thấu hiểu nỗi đau của đối phương, khao khát ôm chặt sẻ chia) 💕😢";
                return;
            }
            if (isDaLow && isOxLow) {
                this.mental_state = "Buồn bã Thất vọng (Lòng tin bị tổn thương, bạn thấy trống rỗng, cô độc và hoài nghi mọi lời dỗ dành) 💔😢";
                return;
            }
        }

        // 2. Phân biệt Giận kiềm chế vs. Bộc phát
        if (isAdHigh && isCoHigh) {
            if (isSeHigh) {
                this.mental_state = "Giận dữ Kiềm chế (Phẫn uất ẩn giấu bên trong, đang cố đè nén để giữ lý trí tự chủ) 🤫😡";
                return;
            }
            if (isSeLow) {
                this.mental_state = "Giận dữ Bộc phát (Cơn thịnh nộ bùng nổ mất kiểm soát, sẵn sàng trút bỏ mọi rào cản) 💥😡";
                return;
            }
        }

        // 3. Phân phổ Khối Cảm xúc Lövheim 3D
        // Joy / Elation: DA cao + 5-HT cao + ADR thấp
        if (isDaHigh && isSeHigh && isAdLow) {
            this.mental_state = "Hài lòng / Bình yên (Tâm hồn nhẹ nhõm, thư thái trọn vẹn và tràn ngập niềm vui dịu êm) 🌸😊";
            return;
        }

        // Interest / Excitement: DA cao + 5-HT thấp + ADR cao
        if (isDaHigh && isSeLow && isAdHigh) {
            this.mental_state = "Hứng khởi / Phấn khích (Tò mò tột độ, tim đập nhanh và tràn trề năng lượng muốn khám phá) 🎉🔥";
            return;
        }

        // Surprise: DA cao + 5-HT cao + ADR cao
        if (isDaHigh && isSeHigh && isAdHigh) {
            this.mental_state = "Kinh ngạc / Bất ngờ (Mọi kỳ vọng bị phá vỡ một cách tích cực, sững sờ ngạc nhiên) 😲✨";
            return;
        }

        // Fear / Terror: DA thấp + 5-HT thấp + ADR cao (Cortisol thấp/trung bình)
        if (isDaLow && isSeLow && isAdHigh && !isCoHigh) {
            this.mental_state = "Sợ hãi / Bất an (Hoang mang tột cùng trước điều bất định, huyết quản căng tràn báo động) 😨💦";
            return;
        }

        // Distress / Anguish: DA thấp + 5-HT thấp + CORT cao + ADR thấp/trung bình
        if (isDaLow && isSeLow && isCoHigh) {
            this.mental_state = "Đau khổ / U sầu (Nỗi đau sầu đè nặng vô vọng, kiệt quệ tinh thần kéo dài) 😭📉";
            return;
        }

        // Disgust: DA cực thấp + 5-HT thấp + ADR thấp
        if (da < 2.5 && isSeLow && isAdLow) {
            this.mental_state = "Kinh tởm / Chán ghét (Cảm giác ghê sợ, không muốn tiếp xúc hay dây dưa chút nào) 🤢";
            return;
        }

        // Shame / Humiliation: DA thấp + 5-HT thấp + ADR thấp + Cortisol thấp
        if (isDaLow && isSeLow && isAdLow && !isCoHigh) {
            this.mental_state = "Xấu hổ / Nhục nhã (Cảm giác bé nhỏ tủi hổ, muốn thu mình trốn tránh ánh nhìn của thế giới) 😳🫣";
            return;
        }

        // 4. Các trạng thái hormone đơn lẻ nổi trội khác
        if (isOxHigh) {
            this.mental_state = "Gắn kết Thân mật (Cảm giác ấm áp dịu dàng, khát khao được chạm vào và yêu thương) 💕🌸";
            return;
        }

        if (sh >= 7.0 && isDaHigh) {
            this.mental_state = "Nóng bỏng / Quyến rũ (Xung năng dồi dào, tràn ngập tự tin và khát khao chiếm lĩnh) 🔥💋";
            return;
        }

        if (en >= 6.5) {
            this.mental_state = "Nhẹ nhõm / Sảng khoái (Cơn đau tan biến, sảng khoái nhẹ bẫng tựa như đang bay bổng) 🌟🍃";
            return;
        }

        if (levels.melatonin >= 6.5) {
            this.mental_state = "Lơ mơ / Buồn ngủ (Mắt nhắm nghiền, suy nghĩ chầm chậm bay bổng theo cơn buồn ngủ) 😴💤";
            return;
        }

        // 5. Cảm giác thể chất tác động đến trạng thái tinh thần y học thực tế
        if (pain >= 7.0) {
            this.mental_state = "Đau đớn dữ dội (Cơ thể chịu tổn thương nghiêm trọng, tâm trí kiệt quệ bám víu vào ý chí sống) 🤕😫";
            return;
        }
        if (dyspnea >= 7.0) {
            this.mental_state = "Ngạt thở / Khó thở (Khí quản nghẹn lại, hoảng hốt đấu tranh giành giật từng hơi thở) 😰🫁";
            return;
        }

        this.mental_state = "Cân bằng / Yên bình 😐";
    }

    serialize() {
        const memSerialized = this.memory.serialize();
        return {
            ...memSerialized,
            neuro_chemistry: this.hormones.serialize(),
            config: this.consciousness.serialize(),
            body: this.body,
            body_status: this.body_status,
            vitals: this.vitals,
            genetics: this.genetics,
            mental_state: this.mental_state,
            last_update_timestamp: this.last_update_timestamp,
            personality: this.personality,
            biomarker_triggers: this.biomarker_triggers,
            neuro_history: this.neuro_history
        };
    }
}
