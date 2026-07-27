import { describe, it, expect } from "vitest";
import {
  parseIntentDetails,
  thaiToArabic,
  isAdminUser,
  stringToColor,
} from "../utils/chatParserUtils";
import { ttsService } from "../services/TextToSpeech";
import { normalizeCustomerName, isProxyUid } from "../utils/deliverySync";
import { logger } from "../utils/logger";

/**
 * Benchmark helper to measure ops/sec and total time
 */
function benchmark(name, fn, iterations = 10000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn(i);
  }
  const end = performance.now();
  const totalMs = end - start;
  const opsPerSec = Math.round((iterations / totalMs) * 1000);
  const avgMsPerOp = (totalMs / iterations).toFixed(5);

  console.log(`⏱️ [BENCHMARK] ${name}:`);
  console.log(`   - Iterations : ${iterations.toLocaleString()}`);
  console.log(`   - Total Time : ${totalMs.toFixed(2)} ms`);
  console.log(`   - Avg Time   : ${avgMsPerOp} ms/op`);
  console.log(`   - Throughput : ${opsPerSec.toLocaleString()} ops/sec\n`);

  return { totalMs, opsPerSec, avgMsPerOp };
}

describe("Performance Benchmark Suite", () => {
  it("Benchmark thaiToArabic (Thai Numeral Conversion)", () => {
    const testString = "จอง ๕๖ สองชิ้น ครับ ๑๒๓๔๕๖๗๘๙๐";
    const res = benchmark("thaiToArabic()", () => thaiToArabic(testString), 50000);
    expect(res.totalMs).toBeLessThan(1000);
  });

  it("Benchmark parseIntentDetails (Regex Chat Parser)", () => {
    const testCases = [
      "จอง 55 สองชิ้นครับ",
      "CF 123",
      "CC ยกเลิก 45",
      "ส่งของวันที่ 30 พ.ย.",
      "เสื้อไซส์อะไรครับ มีสีอะไรบ้าง",
    ];

    const res = benchmark("parseIntentDetails()", (i) => {
      parseIntentDetails(testCases[i % testCases.length]);
    }, 20000);

    expect(res.totalMs).toBeLessThan(2000);
  });

  it("Benchmark isAdminUser", () => {
    const res = benchmark("isAdminUser()", () => {
      isAdminUser("Admin_Manow", "แอดมินมะนาว");
    }, 50000);

    expect(res.totalMs).toBeLessThan(1000);
  });

  it("Benchmark TTS sanitize()", () => {
    const text = "สวัสดีครับ 🎄 จอง 55 🥳 ขอบคุณมากครับ 🙏 #โปรดี";
    const res = benchmark("TextToSpeech.sanitize()", () => {
      ttsService.sanitize(text);
    }, 20000);

    expect(res.totalMs).toBeLessThan(1000);
  });

  it("Benchmark normalizeCustomerName() & isProxyUid()", () => {
    const res = benchmark("normalizeCustomerName()", () => {
      normalizeCustomerName("  คุณ มะนาว แซ่บ  ");
      isProxyUid("proxy-123456");
    }, 50000);

    expect(res.totalMs).toBeLessThan(1000);
  });

  it("Benchmark logger.time() Execution Time Tracking Helper", async () => {
    const result = await logger.timeAsync("Mock Async Database Query", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 42;
    });
    expect(result).toBe(42);
  });
});
