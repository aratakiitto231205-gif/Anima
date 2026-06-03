/**
 * MemoryEngine.js - v10.0 (Modularized Memory Engine)
 * 
 * Quản lý cấu trúc bộ nhớ phân tầng:
 * STM Buffer (Short Term Memory) trôi theo Ebbinghaus,
 * Drawer (Long Term Memory) lưu giữ các thẻ ký ức liên tưởng bằng Jaccard Similarity,
 * Beliefs (Hệ niềm tin cốt lõi) và Shattered Beliefs (Khủng hoảng nhận thức Festinger).
 */

export function getKeywords(text) {
    if (!text) return [];
    const normalized = text.toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'–\u201C\u201D\u2018\u2019"']/g, " ")
        .replace(/\s+/g, " ");
    const stopWords = new Set([
        "là", "thì", "mà", "của", "và", "nhưng", "có", "được", "bị", "một", "những", 
        "cái", "con", "đây", "đó", "này", "kia", "sẽ", "đã", "đang", "rồi", "lại",
        "cho", "với", "từ", "ra", "vào", "lên", "xuống", "đến", "đi", "về", "làm",
        "cũ", "mới", "tôi", "em", "anh", "nó", "chúng", "ta", "quá", "lắm", "nha", "nhé",
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "of", "to", "in"
    ]);
    const words = normalized.split(" ");
    return words.filter(word => word.length > 1 && !stopWords.has(word));
}

export function getJaccardSimilarity(text1, text2) {
    const kw1 = getKeywords(text1);
    const kw2 = getKeywords(text2);
    if (kw1.length === 0 || kw2.length === 0) return 0;
    
    const set1 = new Set(kw1);
    const intersection = kw2.filter(w => set1.has(w));
    const union = new Set([...kw1, ...kw2]);
    return intersection.length / union.size;
}

export class MemoryEngine {
    constructor(memoryData = null, genetics = null) {
        this.core_memories = memoryData?.core_memories || [];
        this.recallable_drawer = memoryData?.recallable_drawer || [];
        this.beliefs = memoryData?.beliefs || [];
        this.shattered_beliefs = memoryData?.shattered_beliefs || [];
        this.chronicles = memoryData?.chronicles || [];
        this.stm_buffer = memoryData?.stm_buffer || []; // Bộ đệm Working Memory STM
        this.in_crisis = memoryData?.in_crisis || false;
        
        let baseThreshold = memoryData?.personality?.habit_threshold || 3;
        if (genetics && genetics.drd4 === '7R+') {
            this.habit_threshold = 5; // Ngưỡng tạo thói quen cao hơn do Novelty Seeking
        } else {
            this.habit_threshold = baseThreshold;
        }
    }

    /**
     * Đồng bộ nhận thức theo Dòng Thời gian (Temporal Anchoring)
     * Bản nâng cấp v8.1: KHÔNG XÓA KÝ ỨC TƯƠNG LAI. Các ký ức song song được bảo toàn
     * để làm chất liệu tạo cảm xúc Déjà vu đầy nghệ thuật. Chỉ đồng bộ nồng độ sinh hóa thần kinh.
     */
    applyTemporalAnchor(currentMessageIndex, hormones = null, neuro_history = null) {
        if (currentMessageIndex === undefined || currentMessageIndex === null) return;

        // Giải phóng trạng thái khủng hoảng nếu không còn niềm tin nào vỡ vụn
        if (this.shattered_beliefs && this.shattered_beliefs.length === 0) {
            this.in_crisis = false;
        }

        // Khôi phục trạng thái sinh hóa ngược dòng thời gian (neuro_history rollback)
        if (hormones && neuro_history) {
            // Tìm lịch sử lưu trữ gần nhất trong quá khứ
            const indices = Object.keys(neuro_history).map(Number).sort((a, b) => b - a);
            const pastIndex = indices.find(idx => idx <= currentMessageIndex);
            if (pastIndex !== undefined && neuro_history[pastIndex]) {
                hormones.levels = { ...neuro_history[pastIndex] };
            }
        }
    }

    /**
     * Phân rã trí nhớ ngắn hạn theo đường cong quên Ebbinghaus
     */
    decayShortTermMemory(elapsedMinutes) {
        if (elapsedMinutes <= 0.05) return;
        
        const S_base = 15.0; // Độ bền mặc định của ký ức đệm ngắn hạn (~15 phút)

        this.stm_buffer = this.stm_buffer.map(mem => {
            // Trọng số phai nhạt dần: W_t = W_0 * exp(-t / S)
            const decayFactor = Math.exp(-elapsedMinutes / S_base);
            mem.weight = mem.weight * decayFactor;
            return mem;
        }).filter(mem => mem.weight >= 1.5); // Xóa sổ hẳn khỏi bộ đệm nếu quá nhạt nhòa (weight < 1.5)
    }

    /**
     * Phân rã khớp thần kinh dài hạn do không sử dụng (Synaptic Decay of Disuse)
     * Thường được gọi khi đóng gói/chốt chương kể chuyện cũ
     */
    decayLongTermMemory() {
        this.recallable_drawer = this.recallable_drawer.map(mem => {
            if (mem.weight > 2.0) {
                mem.weight = Math.max(mem.weight * 0.97, 2.0); // Suy giảm nhẹ 3%
            }
            return mem;
        });
    }

    /**
     * Học ký ức quan sát mới (quan điểm, bài học, vết thương...)
     * 1. Củng cố trực tiếp vào dài hạn (LTM) nếu đi kèm trạng thái xúc cảm cực độ (Stress/Trauma hoặc Thân mật/Phấn khích cực hạn >= 7.0)
     * 2. Nếu bình thường, lưu tạm vào bộ đệm ngắn hạn (STM Buffer).
     */
    learnMemoryDynamically(text, messageIndex, hormones) {
        if (!text || text.trim().length < 5) return false;

        const newId = 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        const adr = hormones.adrenaline || 2.0;
        const cort = hormones.cortisol || 2.0;
        const oxy = hormones.oxytocin || 5.0;
        const dop = hormones.dopamine || 5.0;
        const sex = hormones.sex_hormones || 5.0;
        const mel = hormones.melatonin || 2.0;

        // Trọng số xúc cảm có trừ đi melatonin gây lơ mơ/brain-fog
        const emotionalIntensity = Math.max(adr, cort, oxy, dop, sex) - (mel * 0.5);
        
        // Đóng dấu cảm xúc Inside Out dựa trên nồng độ hormone thần kinh hiện tại của nhân vật
        const emotionsStamp = {
            joy: parseFloat(Math.min(dop + (oxy * 0.3), 10.0).toFixed(1)),
            sadness: parseFloat(Math.min(cort + (mel * 0.4), 10.0).toFixed(1)),
            fear: parseFloat(Math.min(adr + (cort * 0.4), 10.0).toFixed(1)),
            anger: parseFloat(Math.min(adr + (sex * 0.3), 10.0).toFixed(1)),
            nostalgia: parseFloat(Math.min(oxy + (mel * 0.4), 10.0).toFixed(1))
        };

        const newCard = {
            id: newId,
            content: text.trim(),
            timestamp: new Date().toISOString(),
            anchored_message_index: messageIndex,
            weight: emotionalIntensity >= 7.0 ? 9.0 : 5.0,
            count: 1,
            emotions: emotionsStamp
        };

        // 1. Củng cố thẳng vào LTM nếu xúc cảm cực độ
        if (emotionalIntensity >= 7.0) {
            this.recallable_drawer.push(newCard);
            return 'LTM';
        }

        // 2. Bình thường: Lưu vào stm_buffer
        // Tìm ký ức ngắn hạn tương tự đã tồn tại bằng tương đồng Jaccard ngữ nghĩa cục bộ
        const existing = this.stm_buffer.find(m => {
            const sim = getJaccardSimilarity(m.content, newCard.content);
            return sim >= 0.3; // Tương đồng nghĩa 30% trở lên
        });

        if (existing) {
            existing.count += 1;
            existing.weight = Math.min(existing.weight + 1.5, 10.0);
            existing.emotions = emotionsStamp; // Cập nhật cảm xúc đóng dấu mới nhất
            
            // Hebbian Habit Loop: Vượt ngưỡng thói quen thì củng cố vào dài hạn LTM
            if (existing.count >= this.habit_threshold) {
                this.stm_buffer = this.stm_buffer.filter(m => m.id !== existing.id);
                this.recallable_drawer.push(existing);
                return 'LTM_CONSOLIDATED';
            }
            return 'STM_REINFORCED';
        } else {
            this.stm_buffer.push(newCard);
            return 'STM_CREATED';
        }
    }

    serialize() {
        return {
            core_memories: this.core_memories,
            recallable_drawer: this.recallable_drawer,
            beliefs: this.beliefs,
            shattered_beliefs: this.shattered_beliefs,
            chronicles: this.chronicles,
            stm_buffer: this.stm_buffer,
            in_crisis: this.in_crisis
        };
    }
}
