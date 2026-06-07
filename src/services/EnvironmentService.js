/**
 * EnvironmentService.js - v11.0 (Persistent Physical Environment Service)
 * 
 * Liên lạc với API backend SillyTavern để lưu giữ trạng thái môi trường vật lý:
 * Địa điểm hoạt động (active_location), danh sách vật phẩm (items), số lượng và trạng thái.
 */



export async function getCharacterEnvironment(characterId) {
    if (characterId === undefined || characterId === null) return null;
    try {
        const response = await fetch('/api/extensions/environment/get', {
            method: 'POST',
            headers: SillyTavern.getContext().getRequestHeaders(),
            body: JSON.stringify({ characterId })
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error("Anima Engine: Failed to get environment from server:", e);
    }
    return {
        active_location: "Phòng ngủ",
        locations: {
            "Phòng ngủ": {
                description: "Một phòng ngủ ấm cúng, có một chiếc giường êm ái và một bàn làm việc nhỏ.",
                items: [
                    { name: "Giường ngủ", state: "Đã dọn dẹp ngăn nắp", quantity: 1 },
                    { name: "Bàn làm việc", state: "Có một ngọn đèn dầu đang tắt", quantity: 1 }
                ]
            }
        }
    };
}

export async function saveCharacterEnvironment(characterId, envData) {
    if (characterId === undefined || characterId === null || !envData) return;
    try {
        await fetch('/api/extensions/environment/save', {
            method: 'POST',
            headers: SillyTavern.getContext().getRequestHeaders(),
            body: JSON.stringify({ characterId, envData })
        });
    } catch (e) {
        console.error("Anima Engine: Failed to save environment to server:", e);
    }
}
