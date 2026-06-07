/**
 * HormoneEngine.js - v11.0 (Modularized Neurochemical Axis)
 * 
 * Quản lý 8 chất dẫn truyền thần kinh & hormone:
 * Adrenaline, Cortisol, Melatonin, Dopamine, Serotonin, Oxytocin, Endorphins, Sex Hormones.
 * Áp dụng phương trình Hill (Sigmoid saturation kinetics) và phân rã lũy thừa bậc một.
 */

// Hàm Kinetics liên kết thụ thể Sigmoid thực nghiệm (Hill Equation)
// Ngăn ngừa bão hormone và hiện tượng nhảy vọt cơ học kịch trần 0 và 10
export function applyHillEquation(currentVal, dosage, genetics = null, key = '') {
    if (dosage === 0) return currentVal;
    
    // Khớp nối Đa hình di truyền lên độ nhạy cảm thụ thể sinh học thực tế
    let receptorSensitivity = 1.0;
    if (genetics) {
        if (key === 'oxytocin' && genetics.oxtr === 'A/A') {
            receptorSensitivity = 0.25; // Trơ lì Oxytocin (độ nhạy 25%)
        } else if (key === 'oxytocin' && genetics.oxtr === 'G/G') {
            receptorSensitivity = 2.0; // Đồng cảm cao (độ nhạy gấp đôi)
        }
        
        if (key === 'cortisol' && genetics.serotonin_transporter === 'S/S' && dosage > 0) {
            receptorSensitivity = 1.8; // Nhạy cảm stress (Cortisol tăng nhạy hơn 80%)
        } else if (key === 'cortisol' && genetics.serotonin_transporter === 'L/L' && dosage > 0) {
            receptorSensitivity = 0.5; // Kháng stress tốt (Cortisol nhạy giảm 50%)
        }
    }

    const effectiveDosage = dosage * receptorSensitivity;
    
    // Nếu là liều lượng giảm (ví dụ: cortisol giảm)
    if (effectiveDosage < 0) {
        return Math.max(currentVal + effectiveDosage, 0.0);
    }

    // Nếu là liều lượng tăng: Áp dụng phương trình Hill để tạo độ cong tiệm cận bão hòa (n=2, Kd=3.0)
    const Emax = 10.0 - currentVal; // Mức tăng tối đa còn lại
    if (Emax <= 0.05) return currentVal;
    
    const Kd = 3.0; // Hằng số phân ly
    const n = 2; // Hệ số Hill
    
    const response = Emax * (Math.pow(effectiveDosage, n) / (Math.pow(Kd, n) + Math.pow(effectiveDosage, n)));
    return Math.min(currentVal + response, 10.0);
}

export class HormoneEngine {
    constructor(state = null) {
        this.baseLevels = {
            adrenaline: 2.0,
            cortisol: 2.0,
            melatonin: 2.0,
            dopamine: 5.0,
            serotonin: 5.0,
            oxytocin: 5.0,
            endorphins: 3.0,
            sex_hormones: 5.0
        };

        // Chu kỳ bán thải sinh học thực tế quy đổi sang hằng số phân rã k = ln(2)/t1/2
        this.baseDecay = {
            adrenaline: 0.3465,     // t1/2 = 2 min (Phân rã cực nhanh)
            dopamine: 0.1386,       // t1/2 = 5 min
            oxytocin: 0.0462,       // t1/2 = 15 min
            melatonin: 0.0346,      // t1/2 = 20 min
            endorphins: 0.0346,     // t1/2 = 20 min
            serotonin: 0.0231,      // t1/2 = 30 min
            cortisol: 0.0077,       // t1/2 = 90 min (Stress kéo dài chậm phân rã)
            sex_hormones: 0.0038    // t1/2 = 180 min (Rất chậm)
        };

        this.levels = state ? { ...state } : { ...this.baseLevels };
    }

    decay(elapsedMinutes, bodyState = '', genetics = null) {
        if (elapsedMinutes <= 0.01) return;

        const bodyStr = bodyState.toLowerCase();
        const isExhausted = bodyStr.includes('kiệt sức') || bodyStr.includes('mệt') || bodyStr.includes('chấn thương') || bodyStr.includes('yếu');
        
        const hour = new Date().getHours();
        const isNight = hour >= 22 || hour < 5;

        // Modifiers đa hình di truyền học COMT thực tế
        let comtMultiplier = 1.0;
        if (genetics) {
            if (genetics.comt === 'Val/Val') comtMultiplier = 4.0; // Warrior phân hủy dopamine nhanh gấp 4 lần
            else if (genetics.comt === 'Met/Met') comtMultiplier = 0.25; // Worrier phân hủy dopamine chậm 4 lần
        }

        for (const key in this.levels) {
            const k = this.baseDecay[key] || 0.05;
            let M = 1.0;

            if (isExhausted) {
                if (key === 'cortisol') M = 0.5; // Giảm cortisol chậm đi (stress kéo dài)
                if (key === 'dopamine' || key === 'serotonin') M = 1.5; // Hứng khởi bay màu nhanh hơn
            }

            if (key === 'dopamine') {
                M *= comtMultiplier;
            }

            if (key === 'melatonin') {
                if (isNight) {
                    M = 0.0; // Đêm khuya: Melatonin không tự phân rã
                    // Melatonin tăng tự động mô phỏng cơn buồn ngủ tự nhiên
                    this.levels.melatonin = Math.min(this.levels.melatonin + elapsedMinutes * 0.05, 10.0);
                } else {
                    M = 2.5; // Ban ngày: Melatonin bị triệt tiêu nhanh gấp 2.5 lần
                }
            }

            const base = this.baseLevels[key];
            const current = this.levels[key];

            // 1. Phân rã lũy thừa thực tế C_t = base + (C_0 - base) * exp(-k * t * M)
            let val = base + (current - base) * Math.exp(-k * elapsedMinutes * M);

            // 2. Hệ số Nhiễu loạn Sinh học (Chaos Jitter) - Bơm nhiễu ngẫu nhiên nhỏ để tránh pattern máy móc
            if (key !== 'melatonin' || !isNight) {
                const jitter = (Math.random() - 0.5) * 0.15; // Nhiễu động nhẹ +/- 0.075
                val += jitter;
            }

            this.levels[key] = Math.min(Math.max(val, 0.0), 10.0);
        }
    }

    evaluateEvent(semanticTags, genetics = null) {
        let changed = false;
        
        // Hệ số ngẫu nhiên hóa mức tăng (chaos multiplier) từ 0.8 đến 1.2
        const getJitterMult = () => 0.8 + Math.random() * 0.4;
        const scale = 0.35; // Áp dụng hệ số tỉ lệ 0.35x để hormone biến đổi cực kỳ êm dịu, tự nhiên

        if (semanticTags.has('#danger')) {
            this.levels.adrenaline = applyHillEquation(this.levels.adrenaline, 1.5 * scale * getJitterMult(), genetics, 'adrenaline');
            this.levels.cortisol = applyHillEquation(this.levels.cortisol, 0.6 * scale * getJitterMult(), genetics, 'cortisol');
            this.levels.melatonin = applyHillEquation(this.levels.melatonin, -1.0 * scale * getJitterMult(), genetics, 'melatonin');
            changed = true;
        }

        if (semanticTags.has('#intimate')) {
            this.levels.oxytocin = applyHillEquation(this.levels.oxytocin, 1.5 * scale * getJitterMult(), genetics, 'oxytocin');
            this.levels.serotonin = applyHillEquation(this.levels.serotonin, 1.2 * scale * getJitterMult(), genetics, 'serotonin');
            this.levels.dopamine = applyHillEquation(this.levels.dopamine, 0.8 * scale * getJitterMult(), genetics, 'dopamine');
            this.levels.cortisol = applyHillEquation(this.levels.cortisol, -1.0 * scale * getJitterMult(), genetics, 'cortisol');
            this.levels.adrenaline = applyHillEquation(this.levels.adrenaline, -1.0 * scale * getJitterMult(), genetics, 'adrenaline');
            changed = true;
        }

        if (semanticTags.has('#reward')) {
            this.levels.dopamine = applyHillEquation(this.levels.dopamine, 1.2 * scale * getJitterMult(), genetics, 'dopamine');
            this.levels.serotonin = applyHillEquation(this.levels.serotonin, 0.8 * scale * getJitterMult(), genetics, 'serotonin');
            changed = true;
        }

        if (semanticTags.has('#laugh')) {
            this.levels.endorphins = applyHillEquation(this.levels.endorphins, 1.5 * scale * getJitterMult(), genetics, 'endorphins');
            this.levels.dopamine = applyHillEquation(this.levels.dopamine, 0.8 * scale * getJitterMult(), genetics, 'dopamine');
            changed = true;
        }

        if (semanticTags.has('#flirt')) {
            this.levels.sex_hormones = applyHillEquation(this.levels.sex_hormones, 1.2 * scale * getJitterMult(), genetics, 'sex_hormones');
            this.levels.dopamine = applyHillEquation(this.levels.dopamine, 0.8 * scale * getJitterMult(), genetics, 'dopamine');
            changed = true;
        }

        if (semanticTags.has('#betray')) {
            this.levels.cortisol = applyHillEquation(this.levels.cortisol, 1.8 * scale * getJitterMult(), genetics, 'cortisol');
            this.levels.dopamine = applyHillEquation(this.levels.dopamine, -1.2 * scale * getJitterMult(), genetics, 'dopamine');
            this.levels.serotonin = applyHillEquation(this.levels.serotonin, -1.2 * scale * getJitterMult(), genetics, 'serotonin');
            this.levels.oxytocin = applyHillEquation(this.levels.oxytocin, -1.0 * scale * getJitterMult(), genetics, 'oxytocin');
            changed = true;
        }

        if (semanticTags.has('#sleep')) {
            this.levels.melatonin = applyHillEquation(this.levels.melatonin, 1.5 * scale * getJitterMult(), genetics, 'melatonin');
            this.levels.adrenaline = applyHillEquation(this.levels.adrenaline, -1.0 * scale * getJitterMult(), genetics, 'adrenaline');
            changed = true;
        }

        if (semanticTags.has('#alcohol')) {
            this.levels.dopamine = applyHillEquation(this.levels.dopamine, 1.5 * scale * getJitterMult(), genetics, 'dopamine');
            this.levels.sex_hormones = applyHillEquation(this.levels.sex_hormones, 1.0 * scale * getJitterMult(), genetics, 'sex_hormones');
            changed = true;
        }

        return changed;
    }

    serialize() {
        return { ...this.levels };
    }
}
