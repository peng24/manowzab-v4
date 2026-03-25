const testCases = [
  "ป้าวิภา ส่งเลย",
  "น้องแดง ส่งวันพรุ่งนี้",
  "ส่ง 3 เม.ย.",
  "ส่งวันที่ 3",
  "ยุพิน ส่ง 3เมย",
  "ส่งเลย",
  "ส่งพรุ่งนี้"
];

const shippingNowRegex = /(?:^|\s)(ส่งเลย|ส่งวันนี้)(?:\s|$)/;
const shippingTomorrowRegex = /(?:^|\s)(ส่งพรุ่งนี้|พรุ่งนี้ส่ง)(?:\s|$)/;
const shippingDateRegex = /(?:^|\s)ส่ง(?:วันที่\s*)?(\d{1,2})(?:\s*)(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)?(?:\s|$)/i;

testCases.forEach(t => {
  let name = null;
  let dateAction = null;
  
  // Try to extract name (Admin proxy)
  // Assuming name is at the beginning before the "ส่ง..."
  const proxyMatch = t.match(/^([ก-๛a-zA-Z\s]+?)\s+(ส่งเลย|ส่งวันนี้|ส่งพรุ่งนี้|พรุ่งนี้ส่ง|ส่ง(?:วันที่\s*)?\d{1,2}.*)$/);
  if (proxyMatch) {
    name = proxyMatch[1].trim();
    t = proxyMatch[2]; // Remaining part to process
  }
  
  if (shippingNowRegex.test(t)) dateAction = "NOW";
  else if (shippingTomorrowRegex.test(t)) dateAction = "TOMORROW";
  else {
    const m = t.match(shippingDateRegex);
    if (m) {
      dateAction = `DATE: ${m[1]} ${m[2] || 'NO_MONTH'}`;
    }
  }
  
  console.log({ original: t, name, dateAction });
});
