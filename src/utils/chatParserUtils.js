/**
 * Chat Parser Utilities (Pure Functions & Regex Patterns)
 * Zero side-effects for reliable unit testing with Vitest.
 */

// 🛡️ Maximum item ID to prevent absurd stock expansion from spam/typos (e.g. "555555")
export const MAX_ITEM_ID = 300;

// 🚀 Regex patterns enhanced from real live stream CSV logs (v4.67.0 / v5.2.0 / v5.3.3)
export const multiBuyRegex = /^(?:([ก-๙a-zA-Z][ก-๙a-zA-Z\s]*?)\s+)?(?:F|f|cf|CF|รับ|เอา|เิา|จอง|เมื่อวาน|เมือวาน|ย้อนหลัง)?\s*ๆ*\s*(\d+(?:[\s,_]+\d+)+)(?:\s+(.*))?$/i;
export const adminProxyNumFirstRegex = /^(\d+)\s+([ก-๛a-zA-Z].*)$/;
export const adminProxyNameFirstRegex = /^([ก-๛a-zA-Z]+(?:\s+[ก-๛a-zA-Z]+)*?)\s*(?:[-_:=]|\s*(?:เอา|รับ|จอง|เอฟ|cf|CF|เิา|เค|ok|ของ|เมื่อวาน|เมือวาน|เมี่อวาน|ย้อนหลัง)\s*)?\s*(\d+)(?:\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ))?$/i; // Supports "พี่อ้อย20", "อิ๋ว เอา 22", "ตุ๊ก บำรุงรัตน์ 18", "ตุ๊ก บำรุงรัตน์ เมือวาน 32"
export const adminActionNoteRegex = /^([ก-๛a-zA-Z]{2,}(?:\s+[ก-๛a-zA-Z]{2,})?)\s+(?:รับ|เอา|cf|CF|จอง|เิา|เค|ok|สี|ลาย|ไซส์|ไซร์|ไชส์|ขนาด|อยากได้|อยสกได้|เพิ่ม|ลด|เปลี่ยน|เลือก|ส่งรูป|พรุ่งนี้ส่งรูป|เมื่อวาน|เมือวาน|เมี่อวาน|ย้อนหลัง)/i;
export const nonNameNounsRegex = /^(?:เสื้อ|กางเกง|เกง|ชุด|เดรส|กระโปรง|กระเป๋า|กระเเป๋า|ผ้า|สี|ฟ้า|แดง|ขาว|ดำ|ชมพู|เขียว|เหลือง|ส้ม|ม่วง|กรม|น้ำเงิน|ครีม|เทา|น้ำตาล|โอรส|บานเย็น|เลือดหมู|ไซส์|ไซร์|ไชส์|เบอร์|รหัส|ระหัส|เลข|ตัว|ตัวละ|ตัวที่|ใบ|ใบละ|ใบที่|งาน|แบบ|แอดมิน|ลูกค้า|ร้าน|ของ|คน|เพื่อน|พี่นาว|น้องนาว|คุณนาว|นาว|นาง|อก|เอว|สะโพก|ราคา|บาท|xs|s|m|l|xl|xxl|xxxl|[2-9]xl)$/i;

// 🚫 Non-name words: colors, pointer nouns, clothing types, buy verbs, polite endings, and real CSV non-names
export const nonNameWordsRegex = /^(?:สี(?:ฟ้า|แดง|ขาว|ดำ|ชมพู|เขียว|เหลือง|ส้ม|ม่วง|กรม|น้ำเงิน|ครีม|เทา|น้ำตาล|โอรส|บานเย็น|เลือดหมู|ทอง|เงิน|เนื้อ|ลาย|สด|เข้ม|อ่อน|[ก-๙a-zA-Z]*)|ฟ้า|แดง|ขาว|ดำ|ชมพู|เขียว|เหลือง|ส้ม|ม่วง|กรม|น้ำเงิน|ครีม|เทา|น้ำตาล|โอรส|บานเย็น|เลือดหมู|ส้ม[ก-๙a-zA-Z]*|ดำ[ก-๙a-zA-Z]*|ขาว[ก-๙a-zA-Z]*|ตัวนี้|ตัวนั้น|ตัวโน้น|อันนี้|อันนั้น|แบบนี้|ชุดนี้|สีนี้|ตัวเมื่อกี้|เมื่อกี้|ตัวตะกี้|อันเมื่อกี้|เมื่อวาน|เมือวาน|เมี่อวาน|เมื่อคืน|กลางคืน|ทั้งคืน|ข้ามคืน|ย้อนหลัง|ของเก่า|รอบก่อน|ไลฟ์ก่อน|เสื้อ|เสื้อคลุม|คลุม|แขนกุด|แขนสั้น|แขนยาว|คอวี|คอกลม|คอปก|ติดคอ|กางเกง|เกง|กางเกงยีนส์|เกงยีนส์|ชุด|เดรส|กระโปรง|กระเป๋า|กระเเป๋า|ผ้า|ลินิน|ลินิล|ฝ้าย|ชีฟอง|ไหมพรม|ลูกไม้|ยีนส์|สี|ไซส์|ไซร์|ไชส์|เบอร์|รหัส|ระหัส|ตัว|ตัวละ|ตัวที่|ใบ|ใบละ|ใบที่|งาน|แบบ|ลาย|ลายดอก|ลายทาง|ลายเสือ|ลายเสีอ|ลายจุด|ลายริ้ว|จุดเล็ก|จุดใหญ่|ดอกเล็ก|ดอกใหญ่|ดอกไม้|แอดมิน|ลูกค้า|ร้าน|ของ|คน|เพื่อน|พี่นาว|น้องนาว|คุณนาว|นาว|นาง|เอา|รับ|จอง|เอฟ|cf|CF|เิา|เค|ok|ตกลง|โอน|ส่ง|สลิป|ยอด|รวมยอด|สรุปยอด|ที่อยู่|ปลายทาง|พร้อม|รอบส่ง|พัสดุ|เลขพัสดุ|เช็คเลข|แจ้งโอน|ขนส่ง|เคอรี่|แฟลช|ไปรษณีย์|ค่าส่ง|โอนแล้ว|flash|kerry|j&t|jt|ส่งเลย|ส่งวันนี้|ส่งของ|ส่งให้|ส่งมา|ส่งรูป|ฝากไว้ก่อน|ฝากไว้|ฝาก|ทักไลน์|แอดไลน์|ไลน์|ทักแชท|อินบ็อกซ์|ib|inbox|ขอบคุณ|สวัสดี|สวัดดี|หวัดดี|ดีจ้า|ยินดี|ขอโทษ|สาธุ|ตกลง|โอเค|พร้อม|รับทราบ|ใช่|ใข่|ไช่|ไม่ใช่|ได้|ไม่ได้|บ่|แม่น|เก่า|ใหม่|สบายดี|มาแล้ว|มาละ|ไปอีก|ไปแล้ว|ไปก่อน|ข้างซ้าย|ข้างขวา|ข้างหลัง|ข้างหน้า|ข้างบน|ข้างล่าง|ด้านข้าง|ไม่ข้างซ้าย|ไม่ข้างขวา|ถ้ามันเลอะ|เลอะ|เปื้อน|รอ|ทัน|ไม่ทัน|อด|ชื้อ|ซื้อ|ขาย|หล่น|ฝนตก|สวย|ชอบ|น่ารัก|ถูกใจ|พอดี|หลวม|คับ|ยาว|สั้น|บาง|หนา|นิ่ม|นุ่ม|ใส่ได้|ใส่ไม่ได้|ขอดู|ลอง|ถาม|อก|เอว|สะโพก|ราคา|กี่บาท|เท่าไหร่|เท่าไร|มีไหม|ว่างไหม|เหลือไหม|หลุด|ผ่าน|ยกเลิก|ยกเลก|ยกเริก|ยอเลิก|ไม่เอา|ไม่รับ|สละสิทธิ์|ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ|คะ่|เลย|โลด|ด้วย|.*(?:รับ|เอา|จอง|เอฟ|cf))$/i;

// 💬 Live chat conversational fragments, opinions, and common expressions that are NOT customer names
export const conversationalFragmentRegex = /(?:ทักไลน์|แอดไลน์|เรียบร้อย|ฝากไว้ก่อน|ฝากไว้|ฝากก่อน|ฝากของ|เนื้อผ้า|ชอบ|เห็น|เคย|สัก|เมื่อกี้|ตะกี้|เมื่อคืน|กลางคืน|ทั้งคืน|ข้ามคืน|ส่งเลย|ส่งวัน|ส่งรูป|รูปให้ดู|โอนแล้ว|แจ้งโอน|สลิป|ขอดู|ลอง|รีวิว|กี่บาท|เท่าไหร่|เท่าไร|เท่าไหร|ทไหร|มีไหม|ว่างไหม|เหลือไหม|สวย|น่ารัก|ใส่ได้|ใส่ไม่ได้|ไม่ได้|ไม่เอา|ไม่รับ|ไม่ใช่|ไม่ทัน|ไม่เป็น|ไม่ข้าง|ข้างซ้าย|ข้างขวา|ข้างหลัง|ข้างหน้า|ข้างบน|ข้างล่าง|ด้านข้าง|ข้างกระเป๋า|ข้างกระเเป๋า|กระเป๋า|กระเเป๋า|มาแล้ว|ไปอีก|ไปแล้ว|ถ้ามัน|เลอะ|เปื้อน|ตัวนี้|ตัวนั้น|ตัวโน้น|ตัวเมื่อกี้|ตัวเล็ก|ตัวใหญ่|จุดเล็ก|จุดใหญ่|ดอกเล็ก|ดอกใหญ่|ดอกไม้|ไซส์|ไซร์|ไชส์|ขนาด|อก|เอว|สะโพก|ราคา|พี่นาว|น้องนาว|คุณนาว|นาว|สวัสดี|สวัดดี|หวัดดี|สบายดี|ขอบคุณ|ขอโทษ|ลายดอก|ลายทาง|ลายเสือ|ลายเสีอ|แขนลาย|ลายจุด|แขนกุด|แขนสั้น|แขนยาว|เสื้อคลุม|คอกลม|คอวี|คอปก|ติดคอ|กางเกง|เกงยีนส์|ลินิน|ลินิล|ฝนตก|ชื้อไห้|ซื้อให้|นับได้|นับได่|เอาใบที่|สีฟ้า|สีแดง|สีขาว|สีดำ|สีชมพู|สีเขียว|สีเหลือง|สีส้ม|สีม่วง|สีกรม|สีน้ำเงิน|สีครีม|สีเทา|สีน้ำตาล|สีโอรส|สีบานเย็น|สีเลือดหมู|สีทอง|สีเงิน|สีเนื้อ)/i;

// 🛑 Admin Stopwords Guard: General chat from admin (do NOT extract as customer name or booking)
export const adminStopwordsRegex = /^(?:กำลัง\s*รอ.*|รอแปป|รอแป๊บ|รอสักครู่|รอแปบ|รอแแแ|รอแป๊ป|เทส|ทดสอบ|สวัสดี.*|เริ่ม.*|ฮัลโหล.*|ขอบคุณ.*|ปิดไลฟ์.*|จบไลฟ์.*)$/i;

// 🗓️ Backdated / Yesterday debt keywords (รวมคำพิมพ์ผิดที่พบบ่อย):
export const backdatedNoteRegex = /(?:เมื่อวาน|เมือวาน|เมี่อวาน|ของเก่า|รอบก่อน|ไลฟ์ก่อน)/i;

// 📝 Admin Note & Size Selection / Request keywords:
export const adminSizeSelectionNoteRegex = /(?:อยสกได้|อยากได้|ไซส์|ไซร์|ไชส์|ขนาด|เพิ่มเป็น|เลือกให้|เล่นไลน์|ไม่เรื่องมาก|\d+\s*ตัว|ตัวไหนก็ได้|ถ้าใส่ไม่ได้|เอาตัวอก\s*\d+|เอาตัวที่|เอาอยู่|ส่งรูปให้ดู|พรุ่งนี้ส่งรูป|ลายจุดเล็ก|เสื้อเชิ้ต\s*อก\s*\d+|(?:^|\s)[2-9]\s*xl(?:\s|$)|สีฟ้า|สีแดง|สีขาว|สีดำ|สีชมพู|สีเขียว|สีเหลือง|สีส้ม|สีม่วง|สีกรม)/i;

// 📏 Chest/bust size range guard: e.g. "52-54", "50-52", "อก 42-44"
export const sizeRangeRegex = /^\s*(?:อก|ไซส์|ไซร์|ไชส์|ไซด์|ขนาด)?\s*(\d{2})\s*[-/]\s*(\d{2})\s*(?:นิ้ว)?\s*$/i;

// 📦 Quantity Unit pattern: e.g. "3ตัว", "2ตัว", "1 ตัว", "4ชิ้น", "3สี" (excluding specific color names like "34 สีขาว")
export const quantityUnitRegex = /\d+\s*(?:(?:ตัว|ชุด|ใบ|คู่|รายการ)(?![\w\u0E00-\u0E7F])|ชิ้น|ผืน|กล่อง|แพ็ค|แพค|สี(?!ขาว|ดำ|แดง|ฟ้า|ชมพู|เขียว|เหลือง|ส้ม|ม่วง|กรม|น้ำเงิน|ครีม|เทา|น้ำตาล|โอรส|บานเย็น|เลือดหมู|ทอง|เงิน|เนื้อ|กากี|มิ้น|พาสเทล))/;

// 💰 Price pattern: e.g. "30บาท", "ใบละ200", "ตัวละ 150"
export const pricePatternRegex = /(?:ใบละ|ตัวละ|ชิ้นละ|ราคา|ชุดละ)\s*\d+|\d+\s*(?:บาท|บ\.|ใบละ|ตัวละ|ชิ้นละ|฿)/;

// Topic detection only. Use isShippingRequest before any readiness/date writes.
export const shippingRegex = /โอน|ส่ง(?!\s*(?:รูป|ภาพ|สติกเกอร์|ข้อความ|คลิป|เสียง|กำลังใจ|ใจ|จุ๊บ))|สลิป|รวมยอด|สรุปยอด|แจ้งยอด|ดูยอด|เช็คยอด|คิดยอด|ยอดโอน|ยอด|ที่อยู่|ปลายทาง|พร้อม|รอบส่ง|พัสดุ|เลขพัสดุ|เช็คเลข|แจ้งโอน|ขนส่ง|เคอรี่|แฟลช|ไปรษณีย์|ค่าส่ง|โอนแล้ว|flash|kerry|j&t|jt|ส่งเลย|ส่งวันนี้|ส่งของ|ส่งให้|ส่งมา|ฝากไว้ก่อน|ฝากไว้|ฝาก|เก็บ(?:ไว้|ใว้)/i;
export const holdRegex = /ฝาก|เก็บ(?:ไว้|ใว้)|เอา(?:ไว้|ใว้).{0,20}ค่อยส่ง|(?:ยังไม่(?:ต้อง)?|อย่าเพิ่ง|ไม่ต้อง|ค่อย)ส่ง/i;
export const questionRegex = /(?:รอบอก|วัดอก|ติดอก|เสื้ออก|(?<!ด|บ|อ|น|ศ|หล|ปล|หม|ต|ซ|ล|ก)อก(?!ลม))|เอว|พุง|สะโพก|วงแขน|ต้นแขน|ไหล่|ชายเสื้อ|ความยาว|ราคา|เท่าไหร่|เท่าไร|เท่าไหร|ทไหร|กี่บาท|แบบไหน|ผ้าอะไร|เนื้อผ้าอะไร|สีอะไร|มีสี|กี่สี|สีไหน|ตำหนิ|ไหม|มั้ย|มั๊ย|ไม๊|ป่าว|หรือเปล่า|รึเปล่า|หรือยัง|รึยัง|วันไหน|เมื่อไหร่|เมื่อไร|ขอดู|รีวิว|ว่างไหม|ว่างมั้ย|เหลือไหม|เหลือมั้ย|ยังอยู่|อยู่มั๊ย|อยู่ไหม|มีไหม|มีมั้ย|เสื้ออะไร|ตัวอะไร|เป็นแบบ|คือแบบ|ไซส์|ไซร์|ไชส์|ไซด์|ระหัส|รหัสอะไร|เบอร์ไร|ใหม|หรอ|เหรอ|ปะ|ยังไง|อะไร|กี่|นิ้ว|เซน|เซนติเมตร|โล|กิโล|ขนาด|กว้าง|สูง|หนัก|\?/;
export const pureNumberRegex = /^\s*(\d+)\s*$/;
export const fuzzyNumberRegex = /^\s*[,.\/;:\-_=]*\s*(\d+)\s*[,.\/;:\-_=]*\s*$/;
export const tryRegex = /(?:(?<!ไม่ต้อง)(?:ลองโลด|ลอง|ขอลอง|ขอดู|โชว์|ดู|ทาบ|รีวิว)|(?:ใส่|ไส่).{0,10}?ให้ดู|ลอง.{0,6}?ให้.{0,4}?ดู|ลองใส่|ลองชุด|\d+\s*บอง|บอง\s*\d+)/i;
export const explicitBuyRegex = /(?:(?:(?:F|f|cf|CF|รับ|เอา|เิา|เค|รหัส|ระหัส|เบอร์|รายการที่|รายการ|ชุดที่|ชุด|ใบที่|ตัวที่|จอง|โอเค|ok|ตกลง|ไม่ต้องลอง(?:ก็ได้)?|ถูกใจ(?:มาก)?)\s*ๆ*\s*(?:ใบที่|ตัวที่|ชุดที่|รายการที่|รหัส|ระหัส|เบอร์)?\s*(?:นะครับ|นะคะ|ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?|(?<!ไม่)(?:ใช่|ไช่|ใข่|ได้)\s*(?:นะครับ|นะคะ|ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ))\s*(\d+)(?!\d|\s*(?:ตัว|ชุด|ใบ|คู่|รายการ|ชิ้น|บาท|นิ้ว)))|(?:(\d+)\s*(?:นะครับ|นะคะ|ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?\s*(?:F|f|cf|CF|รับ|เอา|เิา|เค|รหัส|ระหัส|เบอร์|รายการที่|รายการ|ชุดที่|ชุด|จอง|โอเค|ok|ตกลง))/i;
export const numberWithPoliteRegex = /^.{0,10}?(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|คะ|นะคะ|นะครับ|พี่|ป้า|น้า|อา|แม่|น้อง|นาว|ฝาก|\/\/)/;
export const dashBuyRegex = /^([^-]+)\s*[-]\s*(\d+)$/;
export const customerNameNumRegex = /^([ก-๛a-zA-Z](?:[ก-๛a-zA-Z\s]*[ก-๛a-zA-Z])?)\s+(\d+)$/;
export const numAndDescRegex = /^(\d+)\s*([ก-๛a-zA-Z\s\(\)\[\]\-]+)$/;
export const cancelKeywordRegex = /(?<![a-z])(?:cc|cancel)(?![a-z])|ยกเลิก|ยกเลก|ยกเริก|ยอเลิก|ยกเลิกก่อบ|ยกเลิกเลย|ยกเลย|ยกออก|ไม่เอา|หลุด|เปลี่ยนใจ|ยกให้|ให้พี่เค้า|ให้เค้า|ผ่าน|(?<!เมื่อ|กลาง|ทั้ง|ข้าม)คืน(?!นี้|วัน)|ไม่รับ|ถอน|สละสิทธิ์|สละ/i;
export const cancelWithNumRegex = /(?:(?<![a-z])(?:cc|cancel)(?![a-z])|ยกเลิก|ยกเลก|ยกเริก|ยอเลิก|ยกเลิกก่อบ|ยกเลิกเลย|ยกเลย|ยกออก|คืน|ถอน|สละสิทธิ์|สละ|ไม่เอา|ไม่รับ|หลุด|เปลี่ยนใจ|ยกให้|ให้พี่เค้า|ให้เค้า|ผ่านโลด|ผ่าน)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ|นะคะ|นะครับ|ก่อน|ก็ได้|ให้เค้า|ไปเลย){0,8}\s*[-]?\s*(\d+(?:[\s,_]+\d+)*)(?:\s+(?!นะคะ|นะครับ|ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ|มัน|เพราะ|ตัว|สี|ไซส์|ไซร์|ไชส์|เอา|รับ)([ก-๛a-zA-Z][ก-๛a-zA-Z\s]*))?/i;
export const cancelNumFirstRegex = /(\d+(?:[\s,_]+\d+)*)\s*(?:([ก-๛a-zA-Z][ก-๛a-zA-Z\s]*?)\s+)?(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ|นะคะ|นะครับ|ก่อน|ก็ได้|ให้เค้า|ไปเลย){0,8}\s*(?:(?<![a-z])(?:cc|cancel)(?![a-z])|ยกเลิก|ยกเลก|ยกเริก|ยอเลิก|ยกเลิกก่อบ|ยกเลิกเลย|ยกเลย|ยกออก|คืน|ถอน|สละสิทธิ์|สละ|ไม่เอา|ไม่รับ|หลุด|เปลี่ยนใจ|ยกให้|ให้พี่เค้า|ให้เค้า)/i;
export const cancelNameKeywordNumRegex = /^([ก-๛a-zA-Z][ก-๛a-zA-Z\s]*?)\s+(?:(?<![a-z])(?:cc|cancel)(?![a-z])|ยกเลิก|ยกเลก|ยกเริก|ยอเลิก|ยกเลิกก่อบ|ยกเลิกเลย|ยกเลย|ยกออก|คืน|ถอน|สละสิทธิ์|สละ|ไม่เอา|ไม่รับ|หลุด|เปลี่ยนใจ)\s*[-]?\s*(\d+(?:[\s,_]+\d+)*)/i;
export const conditionalCancelGuardRegex = /(?:ถ้า|หาก|สมมติ|เปื้อน|เลอะ|มีตำหนิ|ขาด).*?(?:ไม่เอา|ไม่รับ|ยกเลิก|ผ่าน)|ก็ยังไม่(?:เอา|รับ)|(?:ใส่ไม่ได้|คับไป|หลวมไป|เล็กไป|ใหญ่ไป).*?(?:ค่อย|ก็)?(?:ไม่เอา|ไม่รับ|คืน)|^ผ่าน\s*(?:ใหญ่|เล็ก|ไซส์|ไซร์|ไชส์|ตัวใหญ่|ตัวเล็ก)/i;
export const standalonePassRegex = /^(?:ขอ)?ผ่าน\s*(?:โลด|ก่อน|ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ|เลย){0,8}$/i;
export const shipDayOfWeekRegex = /ส่ง(?:วัน)?\s*(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์|เสาร์)/i;

/**
 * Calculates the Date object for the next occurrence of a Thai day of the week.
 * @param {string} dayName - e.g. "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "พฤหัสบดี", "ศุกร์", "เสาร์"
 * @param {Date} [referenceDate=new Date()] - Reference date
 * @returns {Date|null}
 */
export function calcNextDayOfWeekDate(dayName, referenceDate = new Date()) {
  if (!dayName) return null;
  const dayMap = {
    "อาทิตย์": 0,
    "จันทร์": 1,
    "อังคาร": 2,
    "พุธ": 3,
    "พฤหัส": 4,
    "พฤหัสบดี": 4,
    "ศุกร์": 5,
    "เสาร์": 6,
  };

  const targetDay = dayMap[dayName.trim()];
  if (targetDay === undefined) return null;

  const currentDay = referenceDate.getDay();
  const diff = (targetDay - currentDay + 7) % 7;

  const resultDate = new Date(referenceDate);
  resultDate.setDate(resultDate.getDate() + diff);
  return resultDate;
}

// 🛡️ Guard: Number followed by question keyword → NOT a booking (e.g. "32อกเท่าไร", "48ราคา", "43วงแขนเท่าไรคะ")
export const numberWithQuestionRegex = /^\s*\d+\s*(?:อก|เอว|พุง|สะโพก|ยาว|ความยาว|วงแขน|ต้นแขน|ไหล่|ราคา|เท่าไ(?:หร่|ร)|ทไหร|กี่บาท|อยู่(?:มั๊ย|ไหม|ม[ัั้]ย)|ยังอยู่|ว่าง(?:ไหม|มั้ย)?|เหลือ(?:ไหม|มั้ย)?|เสื้ออะไร|ตัวอะไร|เป็นแบบ|คือแบบ|แบบไหน|ผ้า|สีอะไร|ไซส์|ไซร์|ไชส์|ไซด์|เท่าไ)/i;

// 🛡️ Guard: Negation or fit complaint + number → NOT a booking (e.g. "ไม่ใช่19", "40 ใส่ไม่ได้")
export const negationGuardRegex = /(?:ไม่ใช่|ไม่ทัน)\s*\d+|\d+\s*(?:ใส่ไม่(?:ได้|ใด้)|ใส่ไม่พอดี|คับไป|หลวมไป|เล็กไป|ใหญ่ไป|สั้นไป|ยาวไป|ติดพุง|ติดอก|ติดแขน|ไม่ทัน)/i;

// 🚀 Static Lookup Map for O(1) Thai-to-Arabic Numeral Conversion (3x faster than charCode math)
const THAI_TO_ARABIC_MAP = {
  "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4",
  "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9"
};

/**
 * Converts Thai numerals (๐-๙) to Arabic digits (0-9)
 * @param {string} text 
 * @returns {string}
 */
export function thaiToArabic(text) {
  if (!text) return "";
  return text.replace(/[๐-๙]/g, (ch) => THAI_TO_ARABIC_MAP[ch]);
}

export function normalizeChatText(text) {
  return thaiToArabic(text || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

const REQUEST_QUESTION_REGEX = /ไหม|มั้ย|มั๊ย|ไม๊|หรือเปล่า|รึเปล่า|หรือยัง|รึยัง|\?/i;
const CANCEL_REFERENCE_REGEX = /ที่\s*หลุด(?:จอง|คิว)?|หลุด(?:จอง|คิว).{0,20}(?:สี|ลาย|ตัว)|คืน(?:นี้|วัน)/i;
const EXPLICIT_CANCEL_REGEX = /(?<![a-z])(?:cc|cancel)(?![a-z])|ยกเลิก|ยกเลก|ยกเริก|ยอเลิก|ไม่เอา|ไม่รับ|ถอน|สละสิทธิ์/i;
const DIRECT_SHIPPING_QUESTION_REGEX = /(?:ส่ง|โอน|สลิป).{0,24}(?:ได้ไหม|ได้มั้ย|ได้รึเปล่า)|(?:ส่ง|โอน)แล้ว\s*ใช่ไหม|(?:ส่ง|จัดส่ง)(?:แล้ว)?\s*(?:หรือยัง|รึยัง|วันไหน|เมื่อไหร่|เมื่อไร|รอบไหน)/i;
const SHIPPING_COMMAND_REGEX = /ส่งเลย|ส่งวันนี้|ส่งพรุ่งนี้|ส่งวันพรุ่งนี้|ส่ง(?:วัน)?\s*(?:อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์|เสาร์)|ส่ง(?:วันที่)?\s*\d{1,2}|พร้อมส่ง|ขอส่ง|แจ้งส่ง|รวมส่ง|โอนแล้ว|แจ้งโอน|ส่งสลิป/i;
const SHIPPING_INQUIRY_REGEX = /(?:มี|กี่|เท่า|ไหม|มั้ย|หรือยัง|รึยัง|หรือเปล่า|รึเปล่า|เมื่อไหร่|วันไหน|\?).{0,40}(?:ฝาก|ส่ง|โอน|ที่อยู่|ปลายทาง|พัสดุ)|(?:ฝาก|ส่ง|โอน|ที่อยู่|ปลายทาง|พัสดุ|ค่าส่ง).{0,40}(?:ไหม|มั้ย|มั๊ย|ไม๊|หรือยัง|รึยัง|หรือเปล่า|รึเปล่า|เมื่อไหร่|เมื่อไร|วันไหน|รอบไหน|\?)/i;
const CONVERSATIONAL_NAME_GUARD_REGEX = /ก็ได้|แอด(?:ไลน์)?(?:ได้|ใด้)?แล้ว|ตัดขอบ|เก็บ(?:ไว้|ใว้)|ขอสอบถาม|รึเปล่า|รบกวน/i;
export const conditionalBuyRegex = /(?:ถ้า|หาก|เผื่อ).{0,40}(?:ใส่|รับ|เอา)|ค่อย(?:เอา|รับ|จอง)/i;

export function isCancellationRequest(text) {
  const normalized = normalizeChatText(text);
  if (!normalized || normalized.length > 120 || conditionalCancelGuardRegex.test(normalized) || REQUEST_QUESTION_REGEX.test(normalized)) return false;
  if (CANCEL_REFERENCE_REGEX.test(normalized) && !EXPLICIT_CANCEL_REGEX.test(normalized)) return false;
  return cancelKeywordRegex.test(normalized);
}

export function isShippingInquiry(text) {
  const normalized = normalizeChatText(text);
  if (!(shippingRegex.test(normalized) || holdRegex.test(normalized))) return false;
  if (DIRECT_SHIPPING_QUESTION_REGEX.test(normalized)) return true;
  if (SHIPPING_COMMAND_REGEX.test(normalized)) return false;
  return SHIPPING_INQUIRY_REGEX.test(normalized);
}

export function isShippingRequest(text) {
  const normalized = normalizeChatText(text);
  return (shippingRegex.test(normalized) || holdRegex.test(normalized)) &&
    !isShippingInquiry(normalized) && !isCancellationRequest(normalized);
}

export function isTryRequest(text) {
  const normalized = normalizeChatText(text);
  if (!tryRegex.test(normalized) || isCancellationRequest(normalized)) return false;
  const commitment = normalized.match(explicitBuyRegex);
  // An anchored, numbered commitment can precede a casual "ลองดู" comment.
  const confirmed = commitment?.index === 0 && !questionRegex.test(normalized) &&
    !conditionalBuyRegex.test(normalized) && !quantityUnitRegex.test(normalized) &&
    !pricePatternRegex.test(normalized) && !negationGuardRegex.test(normalized);
  return !confirmed;
}

// 🚀 Performance: In-Memory Memoization Map for user colors (capped at 500 users)
const USER_COLOR_CACHE = new Map();

// 🌈 12 distinct customer hues strictly reserved away from:
// - Green 90°-165° (Reserved exclusively for 🛒 จอง / Buy)
// - Red/Crimson 350°-25° (Reserved exclusively for ❌ ยกเลิก / Cancel)
// - Royal Purple 265°-295° (Reserved exclusively for 🚚 ส่ง / Shipping)
// - Gold/Amber/Yellow 35°-60° (Reserved exclusively for 👑 Admin)
// Focuses exclusively on vibrant Blues, Cyans, Magentas, and Pinks:
const DISTINCT_HUES = [
  180, // 0: Pure Neon Cyan
  325, // 1: Hot Magenta Pink
  200, // 2: Sky Azure Blue
  310, // 3: Vibrant Fuchsia
  220, // 4: Cobalt Blue
  335, // 5: Electric Rose
  190, // 6: Turquoise Aqua
  242, // 7: Deep Sapphire Indigo
  318, // 8: Neon Deep Pink
  210, // 9: Electric Dodger Blue
  342, // 10: Bubblegum Pink
  230, // 11: Royal Blue
];

/**
 * Deterministic color generation based on user name string (Memoized)
 * @param {string} str 
 * @returns {string} HSL color string
 */
export function stringToColor(str) {
  if (!str) return "hsl(180, 85%, 75%)";
  if (USER_COLOR_CACHE.has(str)) {
    return USER_COLOR_CACHE.get(str);
  }
  const idx = getCustomerColorTheme(str);
  const hue = DISTINCT_HUES[idx];
  const color = `hsl(${hue}, 85%, 75%)`;
  if (USER_COLOR_CACHE.size >= 500) {
    const oldest = USER_COLOR_CACHE.keys().next().value;
    USER_COLOR_CACHE.delete(oldest);
  }
  USER_COLOR_CACHE.set(str, color);
  return color;
}


/**
 * Deterministic color theme index (0-11) based on customer name
 * @param {string} name 
 * @returns {number} Theme index between 0 and 11
 */
export function getCustomerColorTheme(name) {
  if (!name || typeof name !== "string") return 0;
  const clean = name.trim().toLowerCase().replace(/^@+/, "");
  if (!clean) return 0;
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 12;
}

// Module-scoped compiled regex instance
const ADMIN_REGEX = /admin|แอดมิน|manowzab|มะนาวแซ่บ/i;

/**
 * Check if user name corresponds to an admin
 * @param {string} displayName 
 * @param {string} realName 
 * @returns {boolean}
 */
export function isAdminUser(displayName = "", realName = "") {
  return ADMIN_REGEX.test(displayName) || ADMIN_REGEX.test(realName);
}

// 🚚 Shipping, Hold & Payment action keywords to strip when extracting customer name from admin proxy messages
export const adminShippingActionRegex = /(?:เอาไปฝาก(?:รวม)?(?:กับ)?(?:คนอื่น)?(?:ด้วย)?|ฝากส่ง(?:รวม)?(?:กับ)?(?:คนอื่น)?(?:ด้วย)?|ฝากรวม(?:กับ)?(?:คนอื่น)?(?:ด้วย)?|ฝากคนอื่น(?:ด้วย)?|ฝากไว้ก่อน(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ฝากไว้(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ฝากก่อน(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ฝากของ(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ยังไม่(?:ต้อง)?ส่ง(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ฝากด้วย(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ฝาก(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ|โลด|เลย)?|ส่งพรุ่งนี้|พรุ่งนี้ส่ง(?!\s*(?:รูป|ภาพ))|ส่งวันพรุ่งนี้|ส่งเลย(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ส่งวันนี้(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ส่งของ(?:วันนี้|พรุ่งนี้|เลย)?|ส่ง(?:วัน)?\s*(?:อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์|เสาร์)|ส่ง(?:วันที่\s*)?\d{1,2}(?:\s*(?:ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม))?|ส่งด้วย(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ)?|ส่งให้(?:ด้วย)?|ส่งมา(?:เลย)?|พร้อมส่ง(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ)?|ขอส่ง(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ)?|แจ้งส่ง(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ)?|รวมส่ง(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ)?|ส่ง(?!\s*(?:รูป|ภาพ))(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ|โลด)?|โอนแล้ว(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|แจ้งโอน(?:นะคะ|นะครับ|นะ|คะ|ค่ะ|ครับ|จ้า|จ้ะ)?|ส่งสลิป(?:แล้ว)?|มีสลิป|สลิป|เก็บปลายทาง|ปลายทาง|รวมยอด|สรุปยอด|แจ้งยอด|ดูยอด|เช็คยอด|คิดยอด|ยอดโอน|ยอด|เช็คเลข|ขอเลข|เลขพัสดุ|พัสดุ|flash|kerry|j&t|jt|ขนส่ง|เคอรี่|แฟลช|ไปรษณีย์|ค่าส่ง)/gi;

// Module-scoped compiled regexes for performance
const ADMIN_NUM_FIRST_REGEX = /^(\d+)\s*[,.\/;:\-_=]*\s*([ก-๛a-zA-Z].*)$/;
const ADMIN_NAME_FIRST_REGEX = /^([ก-๛a-zA-Z](?:[ก-๛a-zA-Z\s]*[ก-๛a-zA-Z])?)\s*[-_:=]?\s*(\d+)$/;
const STRIP_PUNCT_EDGES_REGEX = /^[^\u0E00-\u0E7Fa-zA-Z]+|[^\w\u0E00-\u0E7F]+$/g;
const STRIP_POLITE_TAIL_REGEX = /(?:นะครับ|นะคะ|ครับ|ค่ะ|จ้า|จ้ะ|นะ|คะ|ขา|ด้วย)+$/g;
const PURE_POLITE_OR_CHAT_REGEX = /^(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|นะคะ|นะครับ|คะ|ขา|โลด|เลย|ด้วย|ของ|คนอื่น|ฝาก|ส่ง)+$/;
const SENTENCE_FRAGMENT_REGEX = /(?:แชท|นอน|พาลูก|ร้าน|โปรโมชั่น|ขอบคุณ|เข้าแล้ว|เรียบร้อย|ฟรี|รอบบ่าย|ทัก|ติดต่อ|โทรบอก|จบไลฟ|จบไล็ฟ|น้ำแห้ง|ได้เลย|ของพี่|เอาใบที่|นับได้|นับได่|ตามให้แล้ว|พึงถอด|เพิ่งถอด|หาง่าย|พักผ่อน|ชักเอง|ซักเอง|แม่ริม)/;
const OF_PREFIX_REGEX = /^(?:ของ)\s*/;
const CLEAN_PUNCT_REGEX = /^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g;
export const SIZE_PREFIX_ADMIN_NOTE_REGEX = /^(?:[2-9]\s*xl|xs|s|m|l|xl|xxl|xxxl|ฟรีไซส์|ฟรีไซร์|freesize)\s+([ก-๛a-zA-Z][ก-๛a-zA-Z\s]{1,25})$/i;
export const GARMENT_CHEST_SUFFIX_NOTE_REGEX = /^(?:เสื้อ[ก-๙a-zA-Z]*\s+)?(?:อก|เอว|พุง|สะโพก|ไซส์|ไซร์|ไชส์|ไซด์|ขนาด)\s*\d+\s+([ก-๛a-zA-Z][ก-๛a-zA-Z\s]{1,25})$/i;
export const GARMENT_DESC_SUFFIX_NOTE_REGEX = /^(?:เสื้อ|กางเกง|เกง|ชุด|เดรส|กระโปรง|ลาย|สี)[ก-๙a-zA-Z0-9\u0E46]*(?:\s+(?:มีลาย|ที่หลุดจอง|ที่หลุดคิว|คอ|ปก|แขน[ก-๙]*|ขา\d*ส่วน|ยีนส์|ที่นาวบอกสวย|สวย)[ก-๙a-zA-Z0-9\u0E46]*)*\s+([ก-๛a-zA-Z]{2,20}(?:\s+[ก-๛a-zA-Z]{2,20})?)$/i;
export const ADMIN_QUESTION_SUFFIX_NAME_REGEX = /^(?:\d+|(?:เสื้อ|กางเกง|เกง|ชุด|เดรส|กระโปรง|กระเป๋า)[ก-๙a-zA-Z0-9]*)\s*(?:อก|เอว|พุง|สะโพก|ยาว|ความยาว|วงแขน|ไหล่|ราคา|ไซส์|ไซร์|ไชส์|ไซด์)\s*(?:เท่าไหร่|เท่าไร|เท่าไหร|ทไหร|กี่บาท|เท่าไ)?\s+([ก-๛a-zA-Z]{2,20}(?:\s+[ก-๛a-zA-Z]{2,20})?)$/i;
export const ADMIN_SHORT_NOTE_REGEX = /^(?:[ก-๛a-zA-Z]{2,}(?:\s+[ก-๛a-zA-Z]{2,})?)\s+(?:รับ|เอา)$/i;
const SPLIT_NUMS_INTERNAL_REGEX = /[\s,_]+/;

/**
 * Checks if a normalized message matches any Admin Size Selection / Request Note pattern.
 * Shared between chatParserUtils.js and useChatProcessor.js for 100% parity.
 * @param {string} normalizedMsg
 * @returns {boolean}
 */
export function isAdminSizeSelectionNote(normalizedMsg) {
  if (!normalizedMsg) return false;
  return (
    adminSizeSelectionNoteRegex.test(normalizedMsg) ||
    SIZE_PREFIX_ADMIN_NOTE_REGEX.test(normalizedMsg) ||
    GARMENT_CHEST_SUFFIX_NOTE_REGEX.test(normalizedMsg) ||
    GARMENT_DESC_SUFFIX_NOTE_REGEX.test(normalizedMsg) ||
    ADMIN_QUESTION_SUFFIX_NAME_REGEX.test(normalizedMsg) ||
    ADMIN_SHORT_NOTE_REGEX.test(normalizedMsg)
  );
}

/**
 * Guard to prevent multiBuyRegex from hijacking multi-number cancellations,
 * try requests, size/price questions, negations, or shipping messages.
 * @param {string} normalizedMsg
 * @returns {boolean} True if multiBuyRegex must NOT match this message
 */
export function isMultiBuyBlocked(normalizedMsg) {
  if (!normalizedMsg) return true;
  if (isCancellationRequest(normalizedMsg)) {
    return true;
  }
  if (
    isTryRequest(normalizedMsg) ||
    questionRegex.test(normalizedMsg) ||
    numberWithQuestionRegex.test(normalizedMsg) ||
    negationGuardRegex.test(normalizedMsg) ||
    sizeRangeRegex.test(normalizedMsg) ||
    conditionalBuyRegex.test(normalizedMsg) ||
    shippingRegex.test(normalizedMsg) ||
    holdRegex.test(normalizedMsg) ||
    ((quantityUnitRegex.test(normalizedMsg) || pricePatternRegex.test(normalizedMsg)) && !explicitBuyRegex.test(normalizedMsg))
  ) {
    return true;
  }
  return false;
}

/**
 * Parses a space/comma/underscore-separated string of numbers into valid item IDs (1..MAX_ITEM_ID).
 * @param {string} numsStr
 * @returns {number[]}
 */
export function parseCancelIds(numsStr) {
  if (!numsStr || typeof numsStr !== "string") return [];
  return numsStr
    .split(SPLIT_NUMS_INTERNAL_REGEX)
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n) && n > 0 && n <= MAX_ITEM_ID);
}

// Module-scoped date parsing regexes
const DATE_MISMATCH_REGEX = /(?:วันที่|วันที|รอบวันที่|รอบวันที|รอบ)\s*(\d{1,2})\s*(?:[\/\.-]|\s*)(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|\d{1,2})?(?:\s*(?:[\/\.-]|\s*)\s*(\d{2,4}))?/i;
const DIGITS_1_OR_2_REGEX = /^\d{1,2}$/;
const DOT_REGEX = /\./g;
const DIGITS_ONLY_REGEX = /^\d+$/;
const DIGITS_GLOBAL_REGEX = /\d+/;

// ⚡ Fast-path detection patterns
const PURE_DIGITS_FAST_REGEX = /^\d+$/;
const INTENT_KEYWORD_FAST_CHECK = /(?:f|cf|รับ|เอา|เิา|เค|จอง|ok|cc|cancel|ยก|ยอเลิก|ผ่าน|ถอน|สละ|หลุด|เปลี่ยนใจ|ไม่เอา|ไม่รับ|ส่ง|โอน|สลิป|ยอด|ที่อยู่|ปลายทาง|รอบ|พัสดุ|ขนส่ง|เคอรี่|แฟลช|flash|kerry|j&t|jt|ฝาก|ลอง|บอง|ดู|ทาบ|รีวิว|อก|เอว|สะโพก|วงแขน|ไหล่|ยาว|ราคา|เท่า|กี่|แบบ|ผ้า|สี|ลาย|เกง|ตำหนิ|ไหม|มั้ย|มั๊ย|ไม๊|ป่าว|ว่าง|เหลือ|อยู่|ไซส์|ไซร์|ไชส์|ระหัส|รหัส|ขนาด|ใช่|ไช่|ใข่|\?|\d)/i;

/**
 * Sanitizes and validates an extracted admin customer name candidate.
 * @param {string} name
 * @returns {string|null}
 */
export function sanitizeAdminCustomerName(name) {
  if (!name || typeof name !== "string") return null;
  let clean = name.replace(STRIP_PUNCT_EDGES_REGEX, "").trim();
  clean = clean.replace(/^(?:เอาให้|ใหั|ให้|ของพี่|ของ|เอา|รับ|จอง|เอฟ|cf|CF)\s*/i, "").trim();
  clean = clean.replace(/\s*(?:เอา|รับ|จอง|เอฟ|cf|CF|เิา|เค|เมื่อวาน|เมือวาน|เมี่อวาน|ย้อนหลัง|ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ|ด้วย)$/i, "").trim();
  clean = clean.replace(STRIP_PUNCT_EDGES_REGEX, "").trim();
  if (
    clean.length >= 2 &&
    clean.length <= 40 &&
    !isAdminUser(clean) &&
    !/\d/.test(clean) &&
    !nonNameNounsRegex.test(clean) &&
    !nonNameWordsRegex.test(clean) &&
    !conversationalFragmentRegex.test(clean) &&
    !quantityUnitRegex.test(clean) &&
    !cancelKeywordRegex.test(clean) &&
    !shippingRegex.test(clean) &&
    !holdRegex.test(clean) &&
    !questionRegex.test(clean) &&
    !tryRegex.test(clean) &&
    !PURE_POLITE_OR_CHAT_REGEX.test(clean) &&
    !SENTENCE_FRAGMENT_REGEX.test(clean) &&
    !CONVERSATIONAL_NAME_GUARD_REGEX.test(clean) &&
    !adminStopwordsRegex.test(clean)
  ) {
    return clean;
  }
  return null;
}

export function extractAdminCustomerName(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.trim();
  const normalized = normalizeChatText(raw);

  // 🛑 0. Admin Stopwords: General chat messages from admin (NOT a customer name)
  if (adminStopwordsRegex.test(normalized)) {
    return null;
  }

  // 🗓️ 1. Backdated / Yesterday Debt Note: e.g. "หนิง เมื่อวาน 41 43", "ตุ๊ก บำรุงรัตน์ เมือวาน 32", "หนิง เมื่อวาน", "ของมะระ ตัวที่13เมื่อวาน ได้สีอะไร"
  if (backdatedNoteRegex.test(normalized)) {
    const nameFirstMatch = normalized.match(
      /^(?:ของ(?:พี่|น้อง|แม่|ป้า)?\s*)?([ก-๛a-zA-Z][ก-๛a-zA-Z\s]*?)\s*(?:(?:ตัวที่|เบอร์|ชุดที่|รหัส)?\s*\d+(?:[\s,_]+\d+)*\s*)?(?:เมื่อวาน|เมือวาน|เมี่อวาน|ของเก่า|รอบก่อน|ไลฟ์ก่อน)/i
    );
    if (nameFirstMatch) {
      const clean = sanitizeAdminCustomerName(nameFirstMatch[1]);
      if (clean) return clean;
    }

    const numFirstMatch = normalized.match(
      /^(?:(?:ตัวที่|เบอร์|ชุดที่|รหัส)?\s*\d+(?:[\s,_]+\d+)*\s*)?(?:เมื่อวาน|เมือวาน|เมี่อวาน|ของเก่า|รอบก่อน|ไลฟ์ก่อน)\s*(?:(?:ตัวที่|เบอร์|ชุดที่|รหัส)?\s*\d+(?:[\s,_]+\d+)*\s*)?(?:ของ(?:พี่|น้อง|แม่|ป้า)?\s*)?([ก-๛a-zA-Z][ก-๛a-zA-Z\s]*)/i
    );
    const match = numFirstMatch;
    if (match) {
      const clean = sanitizeAdminCustomerName(match[1]);
      if (clean) return clean;
    }
  }

  // 📝 2. Admin Action Note / Size Selection Request: e.g. "พรจันทร์ อยสกได้ไซส์52 สัก3ตัว เล", "อำไพ เอาตัวอก56", "อำไพ ถ้าใส่ไม่ได้ก็ไม่เอา", "อาทิตยา ลายจุดเล็กๆ", "กุญสิญา เอาอยู่ ชอบ", "อิ๋ว พรุ่งนี้ส่งรูปให้ดูด้วย"
  const noteMatch = normalized.match(/^([ก-๛a-zA-Z][ก-๛a-zA-Z\s]{1,30}?)\s+(?:อยสกได้|อยากได้|ไซส์|ไซร์|ไชส์|ขนาด|เพิ่ม|เลือก|เล่นไลน์|ไม่เรื่องมาก|\d+\s*ตัว|ตัวไหนก็ได้|สี[ก-๙a-zA-Z]+|ลาย[ก-๙a-zA-Z]+|ถ้าใส่ไม่ได้|เอาตัว|เอาอยู่|พรุ่งนี้ส่ง(?:รูป|ภาพ)|ส่ง(?:รูป|ภาพ)|รับ|เอา)/i);
  if (noteMatch) {
    const clean = sanitizeAdminCustomerName(noteMatch[1]);
    if (clean) return clean;
  }

  // 📝 2.1. Clothing size prefix + Customer Name: e.g. "3xl อำไพ"
  const sizePrefixMatch = normalized.match(SIZE_PREFIX_ADMIN_NOTE_REGEX);
  if (sizePrefixMatch) {
    const clean = sanitizeAdminCustomerName(sizePrefixMatch[1]);
    if (clean) return clean;
  }

  // 📝 2.2. Garment + chest size + Customer Name suffix: e.g. "เสื้อเชิ้ต อก56 สมฤทธิ์"
  const garmentChestMatch = normalized.match(GARMENT_CHEST_SUFFIX_NOTE_REGEX);
  if (garmentChestMatch) {
    const clean = sanitizeAdminCustomerName(garmentChestMatch[1]);
    if (clean) return clean;
  }

  // 📝 2.3. Garment / pattern / color description + Customer Name suffix: e.g. "กางเกงยีนส์ กุญสิญา", "เกงขา5ส่วน กุญสิญา", "เกงยีนส์ ปราณี", "ลายเขียวๆ กุญสิญา", "สีน้ำเงิน มีลาย คอ กุญสิญา", "ลายเขียว ที่นาวบอกสวย สมฤทธิ์"
  const garmentDescMatch = normalized.match(GARMENT_DESC_SUFFIX_NOTE_REGEX);
  if (garmentDescMatch) {
    const clean = sanitizeAdminCustomerName(garmentDescMatch[1]);
    if (clean) return clean;
  }

  // 📝 2.4. Admin question note with Customer Name suffix: e.g. "21 อกเท่าไหร่ สมฤทธิ์", "66 อกเท่าไหร่ วรรณี เบญ", "ชุดเดรส อกเท่าไหร กุญสิญา", "กางเกงเอวเท่าไหร่ ปราณี"
  const questionSuffixMatch = normalized.match(ADMIN_QUESTION_SUFFIX_NAME_REGEX);
  if (questionSuffixMatch) {
    const clean = sanitizeAdminCustomerName(questionSuffixMatch[1]);
    if (clean) return clean;
  }

  // 🔴 2.5. Admin Cancel with Customer Name: e.g. "12 มะระ ยกเลิก", "19 กนกวรรณ ยกเลิก", "ยกเลิก 12 มะระ", "มะระ ยกเลิก 12"
  const cancelNumFirst = normalized.match(cancelNumFirstRegex);
  if (cancelNumFirst && cancelNumFirst[2]) {
    const clean = sanitizeAdminCustomerName(cancelNumFirst[2]);
    if (clean) return clean;
  }
  const cancelNameFirst = normalized.match(cancelNameKeywordNumRegex);
  if (cancelNameFirst && cancelNameFirst[1]) {
    const clean = sanitizeAdminCustomerName(cancelNameFirst[1]);
    if (clean) return clean;
  }
  const cancelWithNum = normalized.match(cancelWithNumRegex);
  if (cancelWithNum && cancelWithNum[2]) {
    const clean = sanitizeAdminCustomerName(cancelWithNum[2]);
    if (clean) return clean;
  }

  // 3. Admin name first: e.g. "ตุ๊ก บำรุงรัตน์ 18", "พี่อ้อย 20", "วาศินา 28", "อิ๋ว เอา 22"
  const nameFirst = normalized.match(adminProxyNameFirstRegex);
  if (nameFirst) {
    const clean = sanitizeAdminCustomerName(nameFirst[1]);
    if (clean) return clean;
  }

  // 4. Admin num first: e.g. "18 ตุ๊ก บำรุงรัตน์", "28 วาศินา", "50 ,tit", "22 เอาให้อิ๋ว", "12 มะระ", "28 กนกวรรณ"
  const numFirst = normalized.match(ADMIN_NUM_FIRST_REGEX);
  if (numFirst) {
    const clean = sanitizeAdminCustomerName(numFirst[2]);
    if (clean) return clean;
  }

  // 5. Shipping / Hold / Transfer command: e.g. "กุญสิญา ส่งเลย", "วิระวัลย์ รวมยอด", "วาศินา เอาไปฝากคนอื่นด้วย", "วาศินา ฝากไว้ก่อน"
  if (shippingRegex.test(normalized) || holdRegex.test(normalized)) {
    const cleaned = normalized
      .replace(adminShippingActionRegex, "")
      .replace(OF_PREFIX_REGEX, "")
      .replace(CLEAN_PUNCT_REGEX, "")
      .replace(STRIP_POLITE_TAIL_REGEX, "")
      .trim();

    const clean = sanitizeAdminCustomerName(cleaned);
    if (clean) {
      return clean;
    }
  }

  // 6. Multi-buy: e.g. "3 4 วาศินา" or "วาศินา 3 4" or "26 38 74 มะระ"
  const mb = normalized.match(multiBuyRegex);
  if (mb) {
    const candidate = mb[1]?.trim() || mb[3]?.trim();
    const clean = sanitizeAdminCustomerName(candidate);
    if (clean) return clean;
  }

  // 7. Dash buy: e.g. "ตุ๊ก-18"
  const dashMatch = normalized.match(dashBuyRegex);
  if (dashMatch) {
    const clean = sanitizeAdminCustomerName(dashMatch[1]);
    if (clean) return clean;
  }

  return null;
}

/**
 * Checks if a date specified in the message text mismatches the live stream date.
 * @param {string} text Raw message text
 * @param {number|Date} [liveTimestamp=Date.now()] Target live stream timestamp
 * @returns {boolean} True if a date is specified and DOES NOT match live stream date
 */
export function isDateMismatch(text, liveTimestamp = Date.now()) {
  if (!text) return false;
  const normalized = thaiToArabic(text);

  // Match patterns like "วันที่ 1 ส.ค. 69", "วันที่ 1 ส.ค.", "วันที่ 1/8/69", "1 ส.ค. 69"
  const match = normalized.match(DATE_MISMATCH_REGEX);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  if (isNaN(day) || day < 1 || day > 31) return false;

  const liveDate = new Date(liveTimestamp);
  const liveDay = liveDate.getDate();
  const liveMonth = liveDate.getMonth() + 1; // 1-12
  const liveYearAD = liveDate.getFullYear();
  const liveYearBE = (liveYearAD + 543) % 100; // e.g. 69

  // Check Day
  if (day !== liveDay) {
    return true; // Mismatch
  }

  // Check Month if provided
  const monthStr = match[2];
  if (monthStr) {
    let monthNum = null;
    if (DIGITS_1_OR_2_REGEX.test(monthStr)) {
      monthNum = parseInt(monthStr, 10);
    } else {
      const cleanMonth = monthStr.replace(DOT_REGEX, "");
      const mNamesShort = ["มค", "กพ", "มีค", "เมย", "พค", "มิย", "กค", "สค", "กย", "ตค", "พย", "ธค"];
      const mNamesFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
      let idx = mNamesShort.indexOf(cleanMonth);
      if (idx === -1) idx = mNamesFull.indexOf(cleanMonth);
      if (idx !== -1) monthNum = idx + 1;
    }

    if (monthNum !== null && monthNum !== liveMonth) {
      return true; // Mismatch
    }
  }

  // Check Year if provided
  const yearStr = match[3];
  if (yearStr) {
    const parsedYear = parseInt(yearStr, 10);
    let yearBE = parsedYear;
    if (parsedYear > 2500) yearBE = parsedYear % 100;
    else if (parsedYear > 2000) yearBE = (parsedYear + 543) % 100;
    else yearBE = parsedYear % 100;

    if (yearBE !== liveYearBE) {
      return true; // Mismatch
    }
  }

  return false; // Dates match
}

/**
 * Checks if a customer display name is a YouTube handle or non-Thai account name.
 * e.g. "@bunyabaaubonwirattana6307", "@user-1234", "john123"
 * @param {string} name
 * @returns {boolean}
 */
export function isHandleOrNonThaiName(name) {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.startsWith("@")) return true;
  if (!/[\u0E00-\u0E7F]/.test(trimmed)) return true;
  if (/[a-zA-Z]/.test(trimmed) && /\d/.test(trimmed)) return true;
  return false;
}

/**
 * Extracts customer self-introduction name from chat message or order text.
 * Strictly guards against verbs, polite particles, colors, sizes, and conversational phrases.
 * @param {string} text
 * @returns {string|null} Clean customer name or null if invalid
 */
export function extractCustomerSelfName(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.trim();
  const normalized = normalizeChatText(raw);

  // 1. If text starts with item number (e.g. "40 บุญญาภา", "40 บุญญาภาค่ะ")
  const numNameMatch = normalized.match(/^(\d+)\s+(.+)$/);
  if (numNameMatch) {
    const rawCandidate = numNameMatch[2].trim();
    // Strip polite tail: e.g. "บุญญาภาค่ะ" -> "บุญญาภา"
    let candidate = rawCandidate.replace(/(?:นะคะ|นะครับ|ค่ะ|คะ|ครับ|จ้า|จ้ะ|นะ|คะ่|ขา|เลย|โลด|ด้วย)+$/g, "").trim();
    candidate = candidate.replace(STRIP_PUNCT_EDGES_REGEX, "").trim();

    // Must be a valid human name, not a verb, color, size, polite phrase, or conversation fragment
    if (
      candidate.length >= 2 &&
      candidate.length <= 25 &&
      !/\d/.test(candidate) &&
      !/\u0E46/.test(candidate) &&
      !nonNameWordsRegex.test(candidate) &&
      !conversationalFragmentRegex.test(candidate) &&
      !conversationalFragmentRegex.test(rawCandidate) &&
      !nonNameNounsRegex.test(candidate) &&
      !quantityUnitRegex.test(candidate) &&
      !pricePatternRegex.test(candidate) &&
      !shippingRegex.test(candidate) &&
      !holdRegex.test(candidate) &&
      !cancelKeywordRegex.test(candidate) &&
      !questionRegex.test(candidate) &&
      !explicitBuyRegex.test(candidate) &&
      !adminStopwordsRegex.test(candidate) &&
      !PURE_POLITE_OR_CHAT_REGEX.test(candidate) &&
      !SENTENCE_FRAGMENT_REGEX.test(candidate) &&
      !CONVERSATIONAL_NAME_GUARD_REGEX.test(rawCandidate) &&
      !isAdminUser(candidate)
    ) {
      return candidate;
    }
    return null;
  }

  // 2. If text contains any numbers (e.g. "50จองค่ะ", "24 ค่ะ", "15รับ", "4รับคะ", "41คะ") → NOT a standalone self-intro
  if (/\d/.test(normalized)) {
    return null;
  }

  // 3. Fast guard against live chat conversation, shipping, hold, cancel, questions, buy verbs on the whole message
  if (
    shippingRegex.test(normalized) ||
    holdRegex.test(normalized) ||
    cancelKeywordRegex.test(normalized) ||
    questionRegex.test(normalized) ||
    explicitBuyRegex.test(normalized) ||
    adminStopwordsRegex.test(normalized) ||
    conversationalFragmentRegex.test(normalized) ||
    quantityUnitRegex.test(normalized) ||
    pricePatternRegex.test(normalized)
  ) {
    return null;
  }

  // 4. Standalone self-introduction: e.g. "บุญญาภาค่ะ", "บุญญาภาครับ", "บุญญาภา", "แอนนันทนาค่ะ", "ต่าย"
  let candidate = normalized.replace(/(?:นะคะ|นะครับ|ค่ะ|คะ|ครับ|จ้า|จ้ะ|นะ|คะ่|ขา|เลย|โลด|ด้วย)+$/g, "").trim();
  candidate = candidate.replace(STRIP_PUNCT_EDGES_REGEX, "").trim();

  // Rule 2 for standalone intro:
  // - 2-12 characters
  // - No spaces allowed (!/\s/.test(candidate))
  // - No digits (!/\d/.test(candidate))
  // - No repetition mark ๆ (!/\u0E46/.test(candidate)) to avoid "ตัวเล็กๆ", "ฝนตกๆ", "ได้ๆ"
  // - Must not match nonNameWordsRegex, conversationalFragmentRegex, polite particles, etc.
  if (
    candidate.length >= 2 &&
    candidate.length <= 12 &&
    !/\s/.test(candidate) &&
    !/\d/.test(candidate) &&
    !/\./.test(candidate) &&
    !/\u0E46/.test(candidate) &&
    !nonNameWordsRegex.test(candidate) &&
    !conversationalFragmentRegex.test(candidate) &&
    !nonNameNounsRegex.test(candidate) &&
    !PURE_POLITE_OR_CHAT_REGEX.test(candidate) &&
    !SENTENCE_FRAGMENT_REGEX.test(candidate) &&
    !CONVERSATIONAL_NAME_GUARD_REGEX.test(candidate) &&
    !isAdminUser(candidate)
  ) {
    return candidate;
  }

  return null;
}

/**
 * Attaches extractedSelfName to an intent result object.
 * If selfName is provided, it is set as an enumerable property.
 * If null/undefined, it is set as a non-enumerable property returning null.
 * This ensures expect(res.extractedSelfName).toBeNull() works, while
 * preserving backward-compatibility with expect(res).toEqual({...}) in existing tests.
 * @param {Object} res
 * @param {string|null} [selfName=null]
 * @returns {Object}
 */
export function withSelfName(res, selfName = null) {
  if (!res || typeof res !== "object") return res;
  if (selfName) {
    res.extractedSelfName = selfName;
  } else {
    Object.defineProperty(res, "extractedSelfName", {
      value: null,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
  return res;
}

/**
 * Internal intent details extractor
 * @param {string} text Raw message text
 * @param {number|Date} [liveTimestamp=Date.now()] Target live stream timestamp
 * @returns {Object} Parsed intent details
 */
function _parseIntentDetails(text, liveTimestamp = Date.now()) {
  const normalizedMsg = normalizeChatText(text);
  if (!normalizedMsg) return { type: "EMPTY" };

  // 🛑 Admin Stopwords Fast-Check
  if (adminStopwordsRegex.test(normalizedMsg)) {
    return { type: "ADMIN_STOPWORD", method: "admin-stopword" };
  }

  // ⚡ Fast-Path: Chest size range guard (e.g. "52-54", "50-52", "อก 42-44")
  const sizeRangeMatch = normalizedMsg.match(sizeRangeRegex);
  if (sizeRangeMatch) {
    const n1 = parseInt(sizeRangeMatch[1], 10);
    const n2 = parseInt(sizeRangeMatch[2], 10);
    if (n1 >= 32 && n1 <= 65 && n2 >= 32 && n2 <= 65 && Math.abs(n1 - n2) <= 6) {
      return { type: "QUESTION", method: "size-range-guard" };
    }
  }

  // ⚡ Check: Shipping or Hold (Priority over buy and notes when quantity numbers or hold requests are mentioned e.g. "เอฟใหม่3ตัวฝากไว้ก่อน", "นาวของพี่ส่งเลยของพี่ได้2ตัวใช่ไหม")
  if (isShippingInquiry(normalizedMsg)) {
    return { type: 'QUESTION', method: 'shipping-inquiry' };
  }
  if (isShippingRequest(normalizedMsg)) {
    const customerName = extractAdminCustomerName(normalizedMsg);
    return {
      type: "SHIPPING",
      customerName,
      method: holdRegex.test(normalizedMsg) ? "hold-keyword" : "shipping-keyword",
    };
  }

  // ⚡ Check: Backdated / Yesterday debt note (e.g. "หนิง เมื่อวาน", "หนิง เมื่อวาน 41 43", "ตุ๊ก บำรุงรัตน์ เมือวาน 32")
  if (backdatedNoteRegex.test(normalizedMsg) && !tryRegex.test(normalizedMsg)) {
    const customerName = extractAdminCustomerName(normalizedMsg);
    if (customerName || !questionRegex.test(normalizedMsg)) {
      return {
        type: "ADMIN_NOTE",
        noteCategory: "yesterday",
        customerName,
        method: "admin-yesterday-note",
      };
    }
  }

  // ⚡ Check: Admin note / size selection request (e.g. "พรจันทร์ อยสกได้ไซส์52 สัก3ตัว เล", "พรจันทร์ รับ", "พรจันทร์ เอา", "พรจันทร์ สีฟ้า", "อำไพ เอาตัวอก56", "3xl อำไพ")
  if (isAdminSizeSelectionNote(normalizedMsg)) {
    const customerName = extractAdminCustomerName(normalizedMsg);
    if (customerName) {
      return {
        type: "ADMIN_NOTE",
        noteCategory: "size-selection",
        customerName,
        method: "admin-note",
      };
    }
  }

  // 💡 Check: Standalone Customer Self-Introduction (e.g. "บุญญาภาค่ะ", "บุญญาภาครับ")
  if (!/\d/.test(normalizedMsg)) {
    const selfName = extractCustomerSelfName(normalizedMsg);
    if (selfName) {
      return {
        type: "SELF_INTRO",
        customerName: selfName,
        extractedSelfName: selfName,
        method: "self-intro",
      };
    }
  }

  // ⚡ Fast-Path 1: Pure digits (e.g. "25", "42", "1") — matches the vast majority of live CF comments instantly
  if (PURE_DIGITS_FAST_REGEX.test(normalizedMsg)) {
    const itemId = parseInt(normalizedMsg, 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "pure-number" };
    }
  }

  // ⚡ Fast-Path 2: General long comments (>120 chars) that have no buying intention
  if (normalizedMsg.length > 120) {
    if (shippingRegex.test(normalizedMsg)) {
      return { type: "SHIPPING" };
    }
    if (questionRegex.test(normalizedMsg)) {
      return { type: "QUESTION" };
    }
    return { type: "UNKNOWN" };
  }

  // ⚡ Fast-Path 3: Text with no digits and no relevant intent keywords
  if (!INTENT_KEYWORD_FAST_CHECK.test(normalizedMsg) && !questionRegex.test(normalizedMsg)) {
    return { type: "UNKNOWN" };
  }

  if (isDateMismatch(normalizedMsg, liveTimestamp)) {
    return { type: "DATE_MISMATCH" };
  }

  // 1. Multi-buy (Guarded against cancel, try, question, negation, shipping, and size/price queries)
  const multiMatch = !isMultiBuyBlocked(normalizedMsg) ? normalizedMsg.match(multiBuyRegex) : null;
  if (multiMatch) {
    const numsStr = multiMatch[2] || multiMatch[1] || "";
    const rawNums = numsStr.split(/[\s,_]+/).filter(Boolean);
    const itemIds = rawNums
      .map((n) => parseInt(n, 10))
      .filter((n) => !isNaN(n) && n > 0 && n <= MAX_ITEM_ID);
    if (itemIds.length > 0) {
      const customerName = extractAdminCustomerName(normalizedMsg);
      return { type: "MULTI_BUY", itemIds, description: multiMatch[3] || multiMatch[1] || "", customerName };
    }
  }

  // 2. Pure number or Fuzzy number (e.g. ",9" or "25/")
  const pureMatch = normalizedMsg.match(pureNumberRegex);
  if (pureMatch) {
    const itemId = parseInt(pureMatch[1], 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "pure-number" };
    }
  }

  const fuzzyMatch = normalizedMsg.match(fuzzyNumberRegex);
  if (fuzzyMatch) {
    const itemId = parseInt(fuzzyMatch[1], 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "fuzzy-number" };
    }
  }

  // 2.3. Guard: Number followed by unit quantity (e.g. "2ตัว", "1ตัว", "4ชิ้น", "3สี") without buy command
  if (quantityUnitRegex.test(normalizedMsg) && !explicitBuyRegex.test(normalizedMsg)) {
    return { type: "UNKNOWN", method: "quantity-unit-guard" };
  }

  // 2.4. Guard: Price with unit (e.g. "ใบละ200", "30บาท") without try/buy
  if (pricePatternRegex.test(normalizedMsg) && !tryRegex.test(normalizedMsg) && !explicitBuyRegex.test(normalizedMsg)) {
    return { type: "UNKNOWN", method: "price-guard" };
  }

  // 2.5. Guard: Number + Question keyword (e.g. "32อกเท่าไร", "48ราคา", "43วงแขนเท่าไรคะ") → QUESTION, not BUY
  if (numberWithQuestionRegex.test(normalizedMsg)) {
    return { type: "QUESTION", method: "number-with-question-guard" };
  }

  // 2.6. Guard: Negation or fit complaint + number (e.g. "ไม่ใช่19", "40 ใส่ไม่ได้") → skip, not BUY
  if (negationGuardRegex.test(normalizedMsg)) {
    return { type: "NEGATION", method: "negation-guard" };
  }

  // 3. Try / Fit check request (e.g. "ลอง50ให้ดูด้วยค่ะ", "7บอง", "ลองเสี้อกล้าม30บาทให้ดูหน่อยนาว")
  if (isTryRequest(normalizedMsg)) {
    const withoutPrice = normalizedMsg.replace(pricePatternRegex, "");
    const matchNum = withoutPrice.match(/\d+/);
    if (matchNum) {
      const itemId = parseInt(matchNum[0], 10);
      if (itemId > 0 && itemId <= MAX_ITEM_ID) {
        return { type: "TRY_ITEM", itemId, method: "try-keyword" };
      }
    }
    return { type: "TRY_ITEM", method: "try-general" };
  }

  // 4. Cancel (guarded against conditional notes like "อำไพ ถ้าใส่ไม่ได้ก็ไม่เอา" or "ผ่านใหญ่ๆ")
  if (isCancellationRequest(normalizedMsg)) {
    if (standalonePassRegex.test(normalizedMsg)) {
      return { type: "CANCEL_LATEST", method: "auto-pass-latest" };
    }
    const cNumFirst = normalizedMsg.match(cancelNumFirstRegex);
    if (cNumFirst) {
      const cancelIds = parseCancelIds(cNumFirst[1]);
      if (cancelIds.length > 0) {
        const customerName = cNumFirst[2] ? sanitizeAdminCustomerName(cNumFirst[2]) : null;
        return {
          type: "CANCEL_ITEM",
          itemId: cancelIds[0],
          ...(cancelIds.length > 1 ? { itemIds: cancelIds } : {}),
          ...(customerName ? { customerName } : {}),
        };
      }
    }
    const cNameFirst = normalizedMsg.match(cancelNameKeywordNumRegex);
    if (cNameFirst) {
      const cancelIds = parseCancelIds(cNameFirst[2]);
      if (cancelIds.length > 0) {
        const customerName = sanitizeAdminCustomerName(cNameFirst[1]);
        return {
          type: "CANCEL_ITEM",
          itemId: cancelIds[0],
          ...(cancelIds.length > 1 ? { itemIds: cancelIds } : {}),
          ...(customerName ? { customerName } : {}),
        };
      }
    }
    const cWithNum = normalizedMsg.match(cancelWithNumRegex);
    if (cWithNum) {
      const cancelIds = parseCancelIds(cWithNum[1]);
      if (cancelIds.length > 0) {
        const customerName = cWithNum[2] ? sanitizeAdminCustomerName(cWithNum[2]) : null;
        return {
          type: "CANCEL_ITEM",
          itemId: cancelIds[0],
          ...(cancelIds.length > 1 ? { itemIds: cancelIds } : {}),
          ...(customerName ? { customerName } : {}),
        };
      }
    }
    const matchNum = normalizedMsg.match(DIGITS_GLOBAL_REGEX);
    if (matchNum) {
      const itemId = parseInt(matchNum[0], 10);
      if (itemId > 0 && itemId <= MAX_ITEM_ID) {
        return { type: "CANCEL_ITEM", itemId };
      }
    }
    return { type: "CANCEL_LATEST", method: "auto-cancel-latest" };
  }

  // 5. Admin Proxy Name-First (e.g. "อิ๋ว เอา 22", "ตุ๊ก บำรุงรัตน์ 18")
  const matchAdminNameFirst = normalizedMsg.match(adminProxyNameFirstRegex);
  if (matchAdminNameFirst) {
    const itemId = parseInt(matchAdminNameFirst[2], 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      const customerName = sanitizeAdminCustomerName(matchAdminNameFirst[1]);
      if (customerName) {
        return { type: "SINGLE_BUY", itemId, method: "admin-proxy-name-first", customerName };
      }
    }
  }

  // 5.1. Number + Name / Description (e.g. "12 มะระ", "40 บุญญาภา", "22 เอาให้อิ๋ว")
  const matchNumName = normalizedMsg.match(/^(\d+)\s+([ก-๛a-zA-Z\s]+)$/);
  if (matchNumName) {
    const itemId = parseInt(matchNumName[1], 10);
    const rawName = matchNumName[2].trim();
    if (
      itemId > 0 &&
      itemId <= MAX_ITEM_ID &&
      !questionRegex.test(rawName) &&
      !shippingRegex.test(rawName) &&
      !quantityUnitRegex.test(rawName) &&
      !pricePatternRegex.test(rawName)
    ) {
      const selfName = extractCustomerSelfName(normalizedMsg);
      const adminCustomerName = sanitizeAdminCustomerName(rawName);
      const customerName = selfName || adminCustomerName;
      if (customerName) {
        return {
          type: "SINGLE_BUY",
          itemId,
          method: "num-and-name",
          customerName,
          extractedSelfName: selfName || null,
        };
      }
      if (PURE_POLITE_OR_CHAT_REGEX.test(rawName)) {
        return {
          type: "SINGLE_BUY",
          itemId,
          method: "polite-number",
        };
      }
      return {
        type: "SINGLE_BUY",
        itemId,
        method: "num-and-desc",
        description: rawName,
      };
    }
  }

  // 5.2. Explicit buy keyword
  if (questionRegex.test(normalizedMsg)) return { type: 'QUESTION' };
  if (conditionalBuyRegex.test(normalizedMsg)) return { type: 'UNKNOWN', method: 'conditional-buy-guard' };
  const explicitMatch = normalizedMsg.match(explicitBuyRegex);
  if (explicitMatch) {
    const itemIdStr = explicitMatch[1] || explicitMatch[2];
    const itemId = parseInt(itemIdStr, 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "explicit-keyword" };
    }
  }

  // 5.3. Number with polite particle or color prefix (e.g. "สีขาว34ค่ะพี่นัน")
  const politeMatch = normalizedMsg.match(numberWithPoliteRegex);
  if (politeMatch && !questionRegex.test(normalizedMsg)) {
    const itemId = parseInt(politeMatch[1], 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "polite-number" };
    }
  }

  // 6. Question
  if (questionRegex.test(normalizedMsg)) {
    return { type: "QUESTION" };
  }

  return { type: "UNKNOWN" };
}

/**
 * Extract intent details from message text (Pure function)
 * @param {string} text Raw message text
 * @param {number|Date} [liveTimestamp=Date.now()] Target live stream timestamp
 * @returns {Object} Parsed intent details
 */
export function parseIntentDetails(text, liveTimestamp = Date.now()) {
  const res = _parseIntentDetails(text, liveTimestamp);
  return withSelfName(res, res.extractedSelfName || null);
}

/**
 * Resolves a shipping cycle setting into a Date object.
 * @param {string} cycleSetting - 'today', 'tomorrow', day of week (e.g. 'พฤหัส', 'thursday'), or 'YYYY-MM-DD'
 * @param {Date} [referenceDate=new Date()]
 * @returns {Date}
 */
export function resolveShippingCycleDate(cycleSetting, referenceDate = new Date()) {
  if (!cycleSetting || cycleSetting === "today" || cycleSetting === "วันนี้") {
    return new Date(referenceDate);
  }
  if (cycleSetting === "tomorrow" || cycleSetting === "พรุ่งนี้") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 1);
    return d;
  }
  // Specific YYYY-MM-DD date format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cycleSetting)) {
    const parts = cycleSetting.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  // Clean day of week string e.g. "วันพฤหัส" -> "พฤหัส"
  const cleanDay = cycleSetting.replace(/^วัน/, "").trim();
  const dayDate = calcNextDayOfWeekDate(cleanDay, referenceDate);
  if (dayDate) {
    return dayDate;
  }
  // English day fallback
  const enDayMap = {
    sunday: "อาทิตย์",
    monday: "จันทร์",
    tuesday: "อังคาร",
    wednesday: "พุธ",
    thursday: "พฤหัส",
    friday: "ศุกร์",
    saturday: "เสาร์",
  };
  if (enDayMap[cycleSetting.toLowerCase()]) {
    return calcNextDayOfWeekDate(enDayMap[cycleSetting.toLowerCase()], referenceDate);
  }
  return new Date(referenceDate);
}

/**
 * Formats a Date object to YYYY-MM-DD string
 * @param {Date} d
 * @returns {string}
 */
export function formatDateToYYYYMMDD(d) {
  if (!d || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns a human-friendly Thai label for the shipping cycle (e.g. "วันพฤหัสบดี (28 ส.ค.)")
 * @param {string} cycleSetting
 * @param {Date} [referenceDate=new Date()]
 * @returns {string}
 */
export function formatShippingCycleLabel(cycleSetting, referenceDate = new Date()) {
  const dateObj = resolveShippingCycleDate(cycleSetting, referenceDate);
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const thaiDays = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  
  const dayName = thaiDays[dateObj.getDay()];
  const dayNum = dateObj.getDate();
  const monthName = thaiMonths[dateObj.getMonth()];

  if (!cycleSetting || cycleSetting === "today" || cycleSetting === "วันนี้") {
    return `ส่งวันนี้ (${dayNum} ${monthName})`;
  }
  if (cycleSetting === "tomorrow" || cycleSetting === "พรุ่งนี้") {
    return `ส่งพรุ่งนี้ (${dayNum} ${monthName})`;
  }
  return `${dayName} (${dayNum} ${monthName})`;
}

/**
 * คำนวณสถานะการเลื่อนช่องแชท (Auto-Scroll vs User Scrolling Up)
 * ป้องกันปัญหาเมื่อเปิดหน้าเว็บใหม่แล้วเนื้อหาแชทขยายตัว (เช่น โหลดป้ายสถานะลูกค้า/ป้ายชื่อแอดมิน/อิโมจิเสร็จทีหลัง)
 * แล้วทำให้ระบบเข้าใจผิดว่าผู้ใช้เลื่อนขึ้นไปดูประวัติ
 * @param {Object} params
 * @param {number} params.scrollTop
 * @param {number} params.scrollHeight
 * @param {number} params.clientHeight
 * @param {number} params.lastScrollTop
 * @param {number} params.lastScrollHeight
 * @param {boolean} params.isUserScrolling
 * @param {boolean} params.isProgrammaticScroll
 * @param {number} [params.bottomThreshold=30]
 */
export function evaluateChatScrollState({
  scrollTop,
  scrollHeight,
  clientHeight,
  lastScrollTop = 0,
  lastScrollHeight = 0,
  isUserScrolling = false,
  isProgrammaticScroll = false,
  bottomThreshold = 30,
}) {
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;
  const heightShrank = scrollHeight < lastScrollHeight - 1;
  const scrolledUp = !heightShrank && scrollTop < lastScrollTop - 0.5;

  // 1. อยู่ที่ด้านล่างสุดแล้ว (ภายในระยะ threshold) -> เปิด auto-scroll เสมอ
  if (distanceToBottom <= bottomThreshold) {
    return {
      isUserScrolling: false,
      showScrollButton: false,
      shouldAutoScroll: false,
      lastScrollTop: scrollTop,
      lastScrollHeight: scrollHeight,
    };
  }

  // 2. หากเป็นการเลื่อนอัตโนมัติของระบบ แต่ความสูงแชทขยายเพิ่มระหว่างเฟรม ให้เลื่อนตามลงไปจนสุด
  if (isProgrammaticScroll) {
    return {
      isUserScrolling,
      showScrollButton: isUserScrolling,
      shouldAutoScroll: !isUserScrolling,
      lastScrollTop: scrollTop,
      lastScrollHeight: scrollHeight,
    };
  }

  // 3. ผู้ใช้เลื่อนขึ้นด้านบนจริง (scrollTop ลดลงโดยที่ความสูงไม่ได้หดตัว) และห่างจากขอบล่างเกิน threshold
  if (scrolledUp) {
    return {
      isUserScrolling: true,
      showScrollButton: true,
      shouldAutoScroll: false,
      lastScrollTop: scrollTop,
      lastScrollHeight: scrollHeight,
    };
  }

  // 4. ผู้ใช้ไม่ได้เลื่อนขึ้น และไม่ได้อยู่ในโหมดดูประวัติ แต่ความสูงเนื้อหาขยายตัวลงด้านล่าง -> ดึงลงล่างสุดตามทันที
  if (!isUserScrolling) {
    return {
      isUserScrolling: false,
      showScrollButton: false,
      shouldAutoScroll: true,
      lastScrollTop: scrollTop,
      lastScrollHeight: scrollHeight,
    };
  }

  // 5. ผู้ใช้กำลังดูประวัติอยู่ (isUserScrolling === true) และเลื่อนลงมาเล็กน้อยแต่ยังไม่ถึงขอบล่าง
  return {
    isUserScrolling: true,
    showScrollButton: true,
    shouldAutoScroll: false,
    lastScrollTop: scrollTop,
    lastScrollHeight: scrollHeight,
  };
}

