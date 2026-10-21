import { describe, it, expect } from "vitest";
import { isVerifiedAdminSender } from "../utils/chatParserUtils";
import { sanitizeCsvCell, escapeHtml } from "../utils/dbUtils";

describe("🛡️ Security Hardening & Vulnerability Remediation Suite", () => {
  describe("MNZ-SEC-02: isVerifiedAdminSender (YouTube Role Verification)", () => {
    it("recognizes official YouTube Live Chat owner", () => {
      const author = {
        displayName: "Channel Owner",
        channelId: "UC_OWNER_123",
        isChatOwner: true,
        isChatModerator: false,
      };
      expect(isVerifiedAdminSender(author, false, author.displayName, "")).toBe(true);
    });

    it("recognizes official YouTube Live Chat moderator", () => {
      const author = {
        displayName: "Official Mod",
        channelId: "UC_MOD_456",
        isChatOwner: false,
        isChatModerator: true,
      };
      expect(isVerifiedAdminSender(author, false, author.displayName, "")).toBe(true);
    });

    it("REJECTS normal viewer attempting privilege escalation via 'admin' in display name", () => {
      const attacker = {
        displayName: "Admin Hack",
        channelId: "UC_ATTACKER_999",
        isChatOwner: false,
        isChatModerator: false,
      };
      // Even though displayName contains 'admin', YouTube badge properties are false!
      expect(isVerifiedAdminSender(attacker, false, attacker.displayName, attacker.displayName)).toBe(false);
    });

    it("REJECTS normal viewer with Thai 'แอดมิน' in display name", () => {
      const attacker = {
        displayName: "แอดมินเป็ด",
        channelId: "UC_ATTACKER_888",
        isChatOwner: false,
        isChatModerator: false,
      };
      expect(isVerifiedAdminSender(attacker, false, attacker.displayName, attacker.displayName)).toBe(false);
    });

    it("permits verified channel IDs in allowlist even if badge flags are omitted", () => {
      const staff = {
        displayName: "Staff Member",
        channelId: "UC_SPECIAL_STAFF_ID",
      };
      expect(isVerifiedAdminSender(staff, false, staff.displayName, "", ["UC_SPECIAL_STAFF_ID"])).toBe(true);
    });

    it("recognizes internal voice chat price detector", () => {
      expect(isVerifiedAdminSender(null, true, "Voice Detector", "")).toBe(true);
    });

    it("maintains backward compatibility for legacy mock tests without badge properties", () => {
      // If authorDetails is null or lacks isChatOwner/isChatModerator, falls back to legacy check
      expect(isVerifiedAdminSender(null, false, "Admin1", "")).toBe(true);
      expect(isVerifiedAdminSender(null, false, "CustomerA", "")).toBe(false);
    });
  });

  describe("MNZ-SEC-08: sanitizeCsvCell (CSV / Formula Injection Prevention)", () => {
    it("safely quotes normal alphanumeric cells", () => {
      expect(sanitizeCsvCell("Hello World")).toBe('"Hello World"');
      expect(sanitizeCsvCell("มะนาวแซ่บ")).toBe('"มะนาวแซ่บ"');
      expect(sanitizeCsvCell(12345)).toBe('"12345"');
    });

    it("escapes internal double quotes properly", () => {
      expect(sanitizeCsvCell('Size "XL" Dress')).toBe('"Size ""XL"" Dress"');
    });

    it("neutralizes Excel / Google Sheets formula injection triggers (=, +, -, @)", () => {
      expect(sanitizeCsvCell("=cmd|'/C calc'!A0")).toBe("\"'=cmd|'/C calc'!A0\"");
      expect(sanitizeCsvCell("+123456")).toBe("\"'+123456\"");
      expect(sanitizeCsvCell("-123456")).toBe("\"'-123456\"");
      expect(sanitizeCsvCell("@SUM(A1:B10)")).toBe("\"'@SUM(A1:B10)\"");
      expect(sanitizeCsvCell("\tTAB_INJECTION")).toBe("\"'\tTAB_INJECTION\"");
      expect(sanitizeCsvCell("\rRETURN_INJECTION")).toBe("\"'\rRETURN_INJECTION\"");
    });

    it("handles null and undefined values safely", () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });
  });

  describe("MNZ-SEC-04: escapeHtml (XSS Payload Sanitization)", () => {
    it("escapes all dangerous HTML characters", () => {
      const malicious = '<img src=x onerror="alert(1)">';
      expect(escapeHtml(malicious)).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    });

    it("neutralizes script tags and svg onload payloads", () => {
      const scriptPayload = '<script>fetch("http://evil.com")</script>';
      expect(escapeHtml(scriptPayload)).toBe('&lt;script&gt;fetch(&quot;http://evil.com&quot;)&lt;/script&gt;');
    });
  });

  describe("MNZ-SEC-09: CSP (Content Security Policy Completeness)", () => {
    const fs = require("fs");
    const htmlFiles = [
      "index.html",
      "shipping/index.html",
      "history/index.html",
      "address/index.html",
    ];

    it("declares strict CSP meta tag with all required origins across all HTML entrypoints", () => {
      for (const file of htmlFiles) {
        const content = fs.readFileSync(file, "utf8");
        expect(content).toContain('http-equiv="Content-Security-Policy"');
        expect(content).toContain("https://assets.mixkit.co");
        expect(content).toContain("script-src-elem");
        expect(content).toContain("yt3.ggpht.com");
        expect(content).toContain("worker-src 'self' blob:");
      }
    });
  });
});
