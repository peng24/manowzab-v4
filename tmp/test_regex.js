// Regex Test Script for useChatProcessor.js improvements

const adminProxyNumFirstRegex = /^(\d+)\s*(.+)$/;
const adminProxyNameFirstRegex = /^([^\d]+?)\s*(\d+)$/;
const cancelRegex =
  /(?:^|\s)(?:(?:cc|cancel|ยกเลิก|ไม่เอา|หลุด)\s*[-]?\s*(\d+)|(\d+)\s+[\s\S]*?(?:cc|cancel|ยกเลิก|ไม่เอา|หลุด)|(\d+)\s*(?:cc|cancel|ยกเลิก|ไม่เอา|หลุด))/i;
const customerNameNumRegex = /^([ก-๛a-zA-Z][ก-๛a-zA-Z\s]{1,}?)\s+(\d+)$/;
const numberWithPoliteRegex =
  /^.{0,10}?(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|พี่|ป้า|น้า|อา|แม่|น้อง|ฝาก|\/\/)/;
const questionRegex =
  /อก|เอว|สะโพก|ยาว|ราคา|เท่าไหร่|เท่าไร|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม|มั้ย|ป่าว|ขอดู|รีวิว|ว่าง|เหลือ|ยังอยู่|ไซส์/;
const shippingRegex = /โอน|ส่ง|สลิป|ยอด|ที่อยู่|ปลายทาง|พร้อม/;

let passed = 0;
let failed = 0;

function test(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
    console.log(`     Expected: ${JSON.stringify(expected)}`);
    console.log(`     Actual:   ${JSON.stringify(actual)}`);
  }
}

// === 1. Admin Proxy ===
console.log("\n=== Admin Proxy Regex ===");

let m;
m = "พี่อ้อย 13".match(adminProxyNameFirstRegex);
test("พี่อ้อย 13 (name-first, with space)", m && [m[1].trim(), m[2]], ["พี่อ้อย", "13"]);

m = "พี่อ้อย13".match(adminProxyNameFirstRegex);
test("พี่อ้อย13 (name-first, no space)", m && [m[1].trim(), m[2]], ["พี่อ้อย", "13"]);

m = "14พี่อ้อย".match(adminProxyNumFirstRegex);
test("14พี่อ้อย (num-first, no space)", m && [m[1], m[2].trim()], ["14", "พี่อ้อย"]);

m = "14 พี่อ้อย".match(adminProxyNumFirstRegex);
test("14 พี่อ้อย (num-first, with space)", m && [m[1], m[2].trim()], ["14", "พี่อ้อย"]);

// === 2. Cancel Regex ===
console.log("\n=== Cancel Regex ===");

m = "ยกเลิก 54".match(cancelRegex);
test("ยกเลิก 54", m && parseInt(m[1] || m[2] || m[3]), 54);

m = "54 ยกเลิก".match(cancelRegex);
test("54 ยกเลิก", m && parseInt(m[1] || m[2] || m[3]), 54);

m = "54 อัจฉรา ยกเลิก".match(cancelRegex);
test("54 อัจฉรา ยกเลิก (name in between)", m && parseInt(m[1] || m[2] || m[3]), 54);

m = "cancel 10".match(cancelRegex);
test("cancel 10", m && parseInt(m[1] || m[2] || m[3]), 10);

m = "10cc".match(cancelRegex);
test("10cc", m && parseInt(m[1] || m[2] || m[3]), 10);

// === 3. Customer Name + Number ===
console.log("\n=== Customer Name + Number Regex ===");

m = "นันทนา 13".match(customerNameNumRegex);
test("นันทนา 13", m && [m[1].trim(), m[2]], ["นันทนา", "13"]);

m = "พี่อ้อย 5".match(customerNameNumRegex);
test("พี่อ้อย 5", m && [m[1].trim(), m[2]], ["พี่อ้อย", "5"]);

// Should NOT match single-char names (to avoid collisions with "F 13")
m = "F 13".match(customerNameNumRegex);
test("F 13 should NOT match (too short name)", m, null);

// Should be filtered by questionRegex guard
m = "สีแดง 13".match(customerNameNumRegex);
const nameCheck = m ? m[1].trim() : null;
test("สีแดง 13 matches regex but guard blocks it", 
  m !== null && questionRegex.test(nameCheck), true);

// === 4. Number With Polite ===
console.log("\n=== Number With Polite Regex ===");

m = "13ค่ะ".match(numberWithPoliteRegex);
test("13ค่ะ (original case)", m && parseInt(m[1]), 13);

m = "13 ครับ".match(numberWithPoliteRegex);
test("13 ครับ (original case)", m && parseInt(m[1]), 13);

m = "สวัสดี 13 ค่ะ".match(numberWithPoliteRegex);
test("สวัสดี 13 ค่ะ (leading text)", m && parseInt(m[1]), 13);

m = "ขอ 5 จ้า".match(numberWithPoliteRegex);
test("ขอ 5 จ้า (short prefix)", m && parseInt(m[1]), 5);

// Should NOT match very long prefix (>10 chars)
m = "กรุณาช่วยดูรายการ 5 ค่ะ".match(numberWithPoliteRegex);
test("Very long prefix should NOT match", m, null);

// === Summary ===
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
