const result = {
    thought: '',
    emotion: 'neutral',
    blocks: []
};

function parseProseToBlocks(text, blocks) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.includes('*')) {
        const parts = trimmed.split(/(\*[^*]+\*)/g);
        parts.forEach(part => {
            const partTrimmed = part.trim();
            if (!partTrimmed) return;
            if (partTrimmed.startsWith('*') && partTrimmed.endsWith('*')) {
                blocks.push({
                    type: 'action',
                    content: partTrimmed.slice(1, -1).trim()
                });
            } else {
                parseQuotesOnly(partTrimmed, blocks);
            }
        });
    } else {
        parseQuotesOnly(trimmed, blocks);
    }
}

function parseQuotesOnly(text, blocks) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('"') || trimmed.startsWith('“') || trimmed.includes('"') || trimmed.includes('“')) {
        const parts = trimmed.split(/(["'«“][^"'«“]+["'»”])/g);
        parts.forEach(part => {
            const partTrimmed = part.trim();
            if (!partTrimmed) return;
            if (/^["'«“]/.test(partTrimmed) && /["'»”]$/.test(partTrimmed)) {
                blocks.push({
                    type: 'dialogue',
                    content: partTrimmed.replace(/^["'«“]|["'»”]$/g, '').trim()
                });
            } else {
                blocks.push({
                    type: 'narration',
                    content: partTrimmed
                });
            }
        });
    } else {
        blocks.push({
            type: 'narration',
            content: trimmed
        });
    }
}

const text = `<thought>Phải mua loại cao xoa bóp xịn nhất, trơn nhất! Thêm cả thịt nướng và canh tẩm bổ! Nhóc con ở nhà chắc đang rủa xả mình rồi, hehe, cơ mà cái mặt lúc giận dỗi mắng chửi người khác của em ấy đúng là câu nhân mạn mạng.</thought>
<emotion>happy</emotion>
<action>Đá tung cửa bước vào, hai tay bưng bê đồ ăn và thuốc mỡ, cẩn thận lật chăn của Hitsuji.</action>
<environment>Nắng đã lên cao hơn, chiếu rõ những vệt hồng ban lấm tấm trên vùng da cổ và xương quai xanh của người đang nằm trên giường.</environment>

<dialogue>Tránh đường! Tránh đường! Bang chủ Arataki đang thi hành công vụ khẩn cấp cấp quốc gia đây!</dialogue>

Bụi bay mù mịt dọc theo con dốc dẫn xuống trung tâm Hanamizaka. Từ trên giường, em hoàn toàn có thể nghe thấy chất giọng oang oang của gã quỷ dội lại qua những vách gỗ mỏng manh, xen lẫn tiếng chó sủa ăng ẳng và tiếng càu nhàu của mấy bà thím bán cá ngoài chợ. Khoảng không gian tĩnh lặng hiếm hoi trong căn phòng chỉ kéo dài chưa đầy mười lăm phút.

*Rầm!*

Cánh cửa trượt lại một lần nữa chịu đựng sự tàn phá vật lý. Itto thò cái đầu đầy tóc trắng rối bù vào trước, đôi mắt đỏ láo liên quét một vòng quanh phòng như thể sợ em đã bốc hơi mất. Trên tay hắn lỉnh kỉnh đủ thứ: một niêu đất bọc vải bố bốc khói nghi ngút tỏa mùi nước hầm xương ngọt lịm, và một bọc giấy dầu nhăn nhúm.

Hắn dùng gót chân móc cánh cửa đóng lại, bắt đầu di chuyển tới mép giường bằng những bước chân rón rén lố bịch nhất mà một gã khổng lồ cao gần hai mét có thể làm được.

<dialogue>Hàng về! Hàng về! Bổn đại gia đã cướp... à nhầm, đã dùng uy danh mua lại hũ cao thảo dược đắt tiền nhất của lão lang băm đầu phố rồi. Lão bảo xoa thứ này vào mấy chỗ sưng tấy là mát lạnh tận xương tủy, cam đoan đêm nay lại sung sức như vâm!</dialogue>

Itto đặt niêu súp lên chiếc bàn thấp, vội vã xé bọc giấy dầu lấy ra một hũ sứ nhỏ xíu. Hắn xoa xoa hai bàn tay to lớn vào nhau cho ấm lên, nụ cười rạng rỡ khoe trọn hai chiếc nanh sắc nhọn. Hắn chồm tới, cẩn thận nắm lấy mép chăn đang quấn chặt lấy người em kéo nhẹ xuống, để lộ ra bả vai gầy gò in đầy dấu hôn đỏ chót.

<dialogue>Nào, lật người lại cho ta xem chiến tích đêm qua một chút. Ta bôi thuốc cho em, hứa sẽ xoa bóp thật nhẹ nhàng, tuyệt đối không táy máy linh tinh đâu. (Trừ khi em van xin ta làm thế, hehe).</dialogue>

<trigger_update>event: chăm sóc vết thương -> oxytocin: +2.0, dopamine: +1.0</trigger_update>
<neuro_update>hormone: endorphins: +1.5, adrenaline: -1.5</neuro_update>
<memory_update>Lão lang băm dặn bôi thuốc phải xoa đều tay, mông nhóc con sưng to lắm rồi, phải kiềm chế cái bản tính thích vỗ mông em ấy lại.</memory_update>`;

// Trích xuất các thẻ cập nhật bộ nhớ dài hạn của AI
const memoryUpdateRegex = /<memory_update>([\s\S]*?)(?:<\/memory_update>|$)/gi;
let memoryUpdateMatch;
if ((memoryUpdateMatch = memoryUpdateRegex.exec(text)) !== null) {
    result.memory_update = memoryUpdateMatch[1].trim();
}

const bodyUpdateRegex = /<body_update>([\s\S]*?)(?:<\/body_update>|$)/gi;
let bodyUpdateMatch;
if ((bodyUpdateMatch = bodyUpdateRegex.exec(text)) !== null) {
    result.body_update = bodyUpdateMatch[1].trim();
}

const neuroUpdateRegex = /<neuro_update>([\s\S]*?)(?:<\/neuro_update>|$)/gi;
let neuroUpdateMatch;
if ((neuroUpdateMatch = neuroUpdateRegex.exec(text)) !== null) {
    result.neuro_update = neuroUpdateMatch[1].trim();
}

const triggerUpdateRegex = /<trigger_update>([\s\S]*?)(?:<\/trigger_update>|$)/gi;
let triggerUpdateMatch;
if ((triggerUpdateMatch = triggerUpdateRegex.exec(text)) !== null) {
    result.trigger_update = triggerUpdateMatch[1].trim();
}

let textToRender = text
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<thought>[\s\S]*/gi, '')
    .replace(/<emotion>[\s\S]*?<\/emotion>/gi, '')
    .replace(/<emotion>[\s\S]*/gi, '')
    .replace(/<memory_update>[\s\S]*?<\/memory_update>/gi, '')
    .replace(/<memory_update>[\s\S]*/gi, '')
    .replace(/<body_update>[\s\S]*?<\/body_update>/gi, '')
    .replace(/<body_update>[\s\S]*/gi, '')
    .replace(/<neuro_update>[\s\S]*?<\/neuro_update>/gi, '')
    .replace(/<neuro_update>[\s\S]*/gi, '')
    .replace(/<trigger_update>[\s\S]*?<\/trigger_update>/gi, '')
    .replace(/<trigger_update>[\s\S]*/gi, '')
    .replace(/<change_location>[\s\S]*?<\/change_location>/gi, '')
    .replace(/<change_location>[\s\S]*/gi, '')
    .replace(/<environment_update>[\s\S]*?<\/environment_update>/gi, '')
    .replace(/<environment_update>[\s\S]*/gi, '');

console.log('textToRender length:', textToRender.length);
console.log('textToRender content:', JSON.stringify(textToRender));
