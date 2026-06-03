// Final test v4: Updated reward regex with multi-word patterns

const B = '(?<=\\s|^)';
const A = '(?=\\s|$|[.,!?;:\u201C\u201D\u2018\u2019"\'\\)\\]])';
function vw(...words) {
    const escaped = words.map(w => w.includes(' ') ? w : `${B}${w}${A}`);
    return new RegExp(escaped.join('|'), 'i');
}

function testAll(text, expected) {
    const patterns = {
        danger: vw('chết','giết','máu','quái','quỷ','chạy','đuổi','đánh','chém','súng','kiếm','nguy hiểm','thoát','tấn công','địch','die','kill','blood','monster','danger','weapon','attack','gun'),
        intimate: vw('ôm','hôn','nắm tay','vuốt tóc','xoa đầu','dỗ','thương','yêu','ấm áp','bên cạnh','chia sẻ','chữa lành','hug','kiss','love','hold hand','gently','warm','beside','comfort'),
        reward: null, // special handling
        laugh: vw('cười','đùa','hài','vui','trêu','haha','hihi','laugh','joke','funny','fun','tease'),
        flirt: vw('tán','tỉnh','quyến rũ','khiêu khích','đỏ mặt','nóng','thách thức','flirt','sexy','provoke','blush','hot','challenge'),
        betray: vw('nói dối','lừa','phản bội','tồi','đau','khóc','nước mắt','bỏ rơi','tệ','lie','cheat','betray','pain','cry','tear','abandon','sad'),
        sleep: vw('ngủ','ngủ ngon','buồn ngủ','uể oải','khuya','mệt','kiệt sức','sleep','tired','exhaust','sleepy'),
        alcohol: vw('rượu','bia','say','chén','uống','wine','beer','alcohol','drink','drunk')
    };

    const txt = text.toLowerCase();
    const matched = [];
    for (const [name, regex] of Object.entries(patterns)) {
        if (name === 'reward') {
            if (vw('khen','quà','tặng','ramen','thịt','thắng','tuyệt','tuyệt vời','giỏi','giỏi lắm','gift','present','win','delicious','yummy','great','smart','cool').test(txt)
                || /(?:ngon\s+(?:quá|lắm|ghê|thật)|ăn\s+ngon|(?:đẹp|xinh)\s+(?:quá|lắm|ghê|thật|vãi))/i.test(txt)) {
                matched.push(name);
            }
        } else if (regex.test(txt)) {
            matched.push(name);
        }
    }
    const result = matched.join(', ') || 'NONE';
    const icon = result === expected ? "✅" : "❌";
    console.log(`${icon} "${text}" -> [${result}] (expected: ${expected})`);
}

console.log("=== FINAL Test v4 ===\n");

console.log("--- ✅ Positive ---");
testAll("Chạy mau! Quái vật đang đuổi ngay phía sau kìa!", "danger");
testAll("Ôm chặt anh đi, em yêu anh", "intimate");
testAll("Anh ăn ramen này nha, ngon lắm", "reward");
testAll("Haha anh hài quá đi, cười không nổi luôn!", "laugh");
testAll("Anh nhìn gì vậy, đỏ mặt hồi nào vậy?", "flirt");
testAll("Anh đã nói dối em bấy lâu nay, phản bội!", "betray");
testAll("Chúc anh ngủ ngon nha, khuya rồi", "sleep");
testAll("Uống rượu đi, cạn chén nào!", "alcohol");

console.log("\n--- 🚫 Negative (phải là NONE) ---");
testAll("Hôm nay trời đẹp quá nhỉ", "NONE");
testAll("Hông có gì đặc biệt hết á", "NONE");
testAll("Tui về nhà ngồi chơi thôi", "NONE");
testAll("Cảm ơn bạn nhiều nha", "NONE");
testAll("Đi dạo ngoài công viên", "NONE");
testAll("Không có gì thú vị", "NONE");

console.log("\n--- 🔬 Edge cases ---");
testAll("Em ôm anh nha", "intimate");
testAll("Hôn anh một cái", "intimate");
testAll("Ngon quá trời", "reward");
testAll("Ngủ đi con", "sleep");
testAll("Mệt lắm rồi", "sleep");
testAll("Vui quá!", "laugh");
testAll("Đẹp quá!", "reward");
testAll("Yêu anh.", "intimate");
testAll("Tuyệt vời!", "reward");
testAll("Giỏi lắm!", "reward");

console.log("\n--- 🔗 Mixed ---");
testAll("Ôm em, uống rượu nào!", "intimate, alcohol");
testAll("Chạy đi, nguy hiểm lắm!", "danger");
