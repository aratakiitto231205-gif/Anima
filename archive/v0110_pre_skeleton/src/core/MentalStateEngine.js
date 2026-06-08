// v11.0

const EMOTION_RULES = [
    {
        id: 'compassionate_sad',
        test: (h) => h.cortisol >= 5.0 && h.oxytocin >= 6.5,
        label: 'Buồn bã Đồng cảm (Đau lòng thấu hiểu nỗi đau của đối phương, khao khát ôm chặt sẻ chia) 💕😢',
    },
    {
        id: 'disappointed_sad',
        test: (h) => h.cortisol >= 5.0 && h.dopamine < 4.0 && h.oxytocin < 4.0,
        label: 'Buồn bã Thất vọng (Lòng tin bị tổn thương, bạn thấy trống rỗng, cô độc và hoài nghi mọi lời dỗ dành) 💔😢',
    },
    {
        id: 'controlled_anger',
        test: (h) => h.adrenaline >= 4.5 && h.cortisol >= 5.0 && h.serotonin >= 6.5,
        label: 'Giận dữ Kiềm chế (Phẫn uất ẩn giấu bên trong, đang cố đè nén để giữ lý trí tự chủ) 🤫😡',
    },
    {
        id: 'explosive_anger',
        test: (h) => h.adrenaline >= 4.5 && h.cortisol >= 5.0 && h.serotonin < 4.0,
        label: 'Giận dữ Bộc phát (Cơn thịnh nộ bùng nổ mất kiểm soát, sẵn sàng trút bỏ mọi rào cản) 💥😡',
    },
    {
        id: 'serene_happy',
        test: (h) => h.dopamine >= 6.5 && h.serotonin >= 6.5 && h.adrenaline < 2.5,
        label: 'Hài lòng / Bình yên (Tâm hồn nhẹ nhõm, thư thái trọn vẹn và tràn ngập niềm vui dịu êm) 🌸😊',
    },
    {
        id: 'excited_happy',
        test: (h) => h.dopamine >= 6.5 && h.serotonin < 4.0 && h.adrenaline >= 4.5,
        label: 'Hưng khởi / Phấn khích (Tò mò tột độ, tim đập nhanh và tràn trề năng lượng muốn khám phá) 🎉🔥',
    },
    {
        id: 'surprised',
        test: (h) => h.dopamine >= 6.5 && h.serotonin >= 6.5 && h.adrenaline >= 4.5,
        label: 'Kinh ngạc / Bất ngờ (Mọi kỳ vọng bị phá vỡ một cách tích cực, sững sờ ngạc nhiên) 😲✨',
    },
    {
        id: 'fearful',
        test: (h) => h.dopamine < 4.0 && h.serotonin < 4.0 && h.adrenaline >= 4.5 && h.cortisol < 5.0,
        label: 'Sợ hãi / Bất an (Hoang mang tột cùng trước điều bất định, huyết quản căng tràn báo động) 😨💦',
    },
    {
        id: 'distressed',
        test: (h) => h.dopamine < 4.0 && h.serotonin < 4.0 && h.cortisol >= 5.0,
        label: 'Đau khổ / U sầu (Nỗi đau sầu đè nặng vô vọng, kiệt quệ tinh thần kéo dài) 😭📉',
    },
    {
        id: 'disgusted',
        test: (h) => h.dopamine < 2.5 && h.serotonin < 4.0 && h.adrenaline < 2.5,
        label: 'Kinh tởm / Chán ghét (Cảm giác ghê sợ, không muốn tiếp xúc hay dây dưa chút nào) 🤢',
    },
    {
        id: 'ashamed',
        test: (h) => h.dopamine < 4.0 && h.serotonin < 4.0 && h.adrenaline < 2.5 && h.cortisol < 5.0,
        label: 'Xấu hổ / Nhục nhã (Cảm giác bé nhỏ tủi hổ, muốn thu mình trốn tránh ánh nhìn của thế giới) 😳🫣',
    },
    {
        id: 'intimate',
        test: (h) => h.oxytocin >= 6.5,
        label: 'Gắn kết Thân mật (Cảm giác ấm áp dịu dàng, khát khao được chạm vào và yêu thương) 💕🌸',
    },
    {
        id: 'sexy',
        test: (h) => h.sex_hormones >= 7.0 && h.dopamine >= 6.5,
        label: 'Nóng bỏng / Quyến rũ (Xung năng dồi dào, tràn ngập tự tin và khát khao chiếm lĩnh) 🔥💋',
    },
    {
        id: 'relieved',
        test: (h) => h.endorphins >= 6.5,
        label: 'Nhẹ nhõm / Sảng khoái (Cơn đau tan biến, sảng khoái nhẹ bẫng tựa như đang bay bổng) 🌟🍃',
    },
    {
        id: 'sleepy',
        test: (h) => h.melatonin >= 6.5,
        label: 'Lơ mơ / Buồn ngủ (Mắt nhắm nghiền, suy nghĩ chầm chậm bay bổng theo cơn buồn ngủ) 😴💤',
    },
    {
        id: 'severe_pain',
        test: (h, p) => p >= 7.0,
        label: 'Đau đớn dữ dội (Cơ thể chịu tổn thương nghiêm trọng, tâm trí kiệt quệ bám víu vào ý chí sống) 🤕😫',
    },
    {
        id: 'severe_dyspnea',
        test: (h, p, d) => d >= 7.0,
        label: 'Ngạt thở / Khó thở (Khí quản nghẹn lại, hoảng hốt đấu tranh giành giật từng hơi thở) 😰🫁',
    },
];

export class MentalStateEngine {
    constructor(hormones, bodyStatus, vitals = {}) {
        this.hormones = hormones;
        this.bodyStatus = bodyStatus;
        this.vitals = vitals;
    }

    compute(inCrisis = false) {
        if (inCrisis) {
            return 'Khủng hoảng Nhận thức (Hệ niềm tin vỡ vụn) ⚠️';
        }

        const levels = this.hormones.levels;
        const ad = levels.adrenaline;
        const co = levels.cortisol;
        const mel = levels.melatonin || 2.0;

        const pain = this.bodyStatus.pain || 0.0;
        const dyspnea = this.bodyStatus.dyspnea || 0.0;

        // Update vitals
        this.vitals.heart_rate = Math.round(70 + ad * 6.5 + pain * 3.5 + dyspnea * 4.0 - mel * 2.0);
        this.vitals.heart_rate = Math.min(Math.max(this.vitals.heart_rate, 50), 180);

        this.vitals.blood_pressure_sys = Math.round(115 + co * 4.0 + ad * 3.0 + pain * 2.0 - mel * 1.5);
        this.vitals.blood_pressure_sys = Math.min(Math.max(this.vitals.blood_pressure_sys, 85), 190);

        this.vitals.blood_pressure_dia = Math.round(75 + co * 2.5 + ad * 2.0 + pain * 1.0 - mel * 1.0);
        this.vitals.blood_pressure_dia = Math.min(Math.max(this.vitals.blood_pressure_dia, 55), 115);

        this.vitals.resp_rate = Math.round(14 + ad * 1.2 + dyspnea * 1.5 + pain * 0.5 - mel * 0.8);
        this.vitals.resp_rate = Math.min(Math.max(this.vitals.resp_rate, 8), 32);

        this.vitals.body_temp = parseFloat((36.5 + pain * 0.15 + ad * 0.08 - mel * 0.05).toFixed(1));
        this.vitals.body_temp = Math.min(Math.max(this.vitals.body_temp, 35.0), 40.5);

        if (this.vitals.body_temp >= 38.5) {
            this.bodyStatus.temp_sensation = 'Sốt cao / Nóng bức 🥵';
        } else if (this.vitals.body_temp >= 37.5) {
            this.bodyStatus.temp_sensation = 'Sốt nhẹ / Ấm nóng 🌡️';
        } else if (this.vitals.body_temp <= 36.0) {
            this.bodyStatus.temp_sensation = 'Lạnh giá / Hạ thân nhiệt 🥶';
        } else {
            this.bodyStatus.temp_sensation = 'Bình thường 🧘';
        }

        // Determine mental state
        for (const rule of EMOTION_RULES) {
            if (rule.test(levels, pain, dyspnea)) {
                return rule.label;
            }
        }

        return 'Cân bằng / Yên bình 😐';
    }
}
