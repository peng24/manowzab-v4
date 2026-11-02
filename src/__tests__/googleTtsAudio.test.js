import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleTtsAudio } from "../services/GoogleTtsAudio";

const ok = () => ({ ok: true, json: async () => ({ audioContent: btoa("MP3") }) });
const error = (status, reason) => ({ ok: false, status, json: async () => ({ error: { details: [{ reason }] } }) });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe("Google audio preparation (no playback)", () => {
  let loader, cache, config, fetchMock, onKeySuccess, warn;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "true");
    cache = new Map();
    config = { enabled: true, keys: ["key-a", "key-b"], voice: "th-TH-Standard-A", activeKey: 1 };
    fetchMock = vi.fn().mockResolvedValue(ok()); vi.stubGlobal("fetch", fetchMock);
    onKeySuccess = vi.fn(); warn = vi.fn();
    loader = new GoogleTtsAudio({ getConfig: () => config, getCached: key => cache.get(key),
      setCached: (key, buffer) => cache.set(key, buffer), onKeySuccess, warn });
  });
  afterEach(() => { loader.cancel(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("deduplicates in-flight text and returns independent decodable buffers from cache", async () => {
    const [first, second] = await Promise.all([loader.prepare("ทดสอบ"), loader.prepare("ทดสอบ", true)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).not.toBe(second);
    new Uint8Array(first)[0] = 0;
    expect(new Uint8Array(second)[0]).toBe(77);
    expect(new Uint8Array(await loader.prepare("ทดสอบ"))[0]).toBe(77);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).not.toContain("key");
    expect(options.headers["X-Goog-Api-Key"]).toBe("key-a");
    expect(JSON.parse(options.body)).toMatchObject({ input: { text: "ทดสอบ" }, voice: { name: "th-TH-Standard-A" }, audioConfig: { audioEncoding: "MP3" } });
  });

  it("bounds speculative requests to current plus two future messages", async () => {
    const delayed = deferred(); fetchMock.mockReturnValue(delayed.promise);
    const pending = ["หนึ่ง", "สอง", "สาม"].map(text => loader.prepare(text, true));
    expect(await loader.prepare("สี่", true)).toBeNull();
    await flush(); expect(fetchMock).toHaveBeenCalledTimes(3);
    delayed.resolve(ok()); await Promise.all(pending);
    expect(loader.pending.size).toBe(0);
    expect(await loader.prepare("สี่", true)).toBeInstanceOf(ArrayBuffer);
  });

  it("honors the active key and rotates invalid credentials within one shared deadline", async () => {
    config.activeKey = 2;
    fetchMock.mockResolvedValueOnce(error(400, "API_KEY_INVALID")).mockResolvedValueOnce(ok());
    expect(await loader.prepare("ทดสอบ")).toBeInstanceOf(ArrayBuffer);
    expect(fetchMock.mock.calls.map(call => call[1].headers["X-Goog-Api-Key"])).toEqual(["key-b", "key-a"]);
    expect(onKeySuccess).toHaveBeenCalledWith(1);
  });

  it("caps the combined wait for all keys at two seconds even when fetch ignores abort", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const result = loader.prepare("ช้า");
    await vi.advanceTimersByTimeAsync(1999);
    let settled = false; result.then(() => { settled = true; }); await flush(); expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loader.lastError).toBe("TIMEOUT");
    expect(loader.controllers.size).toBe(0);
  });

  it("includes a stalled response body in the timeout", async () => {
    config.keys = ["key-a"];
    fetchMock.mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
    const result = loader.prepare("ช้า");
    await vi.advanceTimersByTimeAsync(1500);
    expect(await result).toBeNull(); expect(loader.lastError).toBe("TIMEOUT");
  });

  it.each([[403, "BILLING_DISABLED", 60000], [429, "RESOURCE_EXHAUSTED", 10000]])(
    "does not churn keys for %s/%s and retries after cooldown", async (status, reason, cooldown) => {
      fetchMock.mockResolvedValueOnce(error(status, reason)).mockResolvedValue(ok());
      expect(await loader.prepare("ครั้งแรก")).toBeNull();
      expect(await loader.prepare("ระหว่างพัก")).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(loader.lastError).toBe(reason);
      await vi.advanceTimersByTimeAsync(cooldown);
      expect(await loader.prepare("ลองใหม่")).toBeInstanceOf(ArrayBuffer);
      expect(loader.lastError).toBeNull(); expect(loader.retryAfter).toBe(0);
    });

  it("supports an explicit retry immediately after Billing is restored", async () => {
    fetchMock.mockResolvedValueOnce(error(403, "BILLING_DISABLED")).mockResolvedValue(ok());
    await loader.prepare("ก่อนเปิด"); loader.retry();
    expect(await loader.prepare("หลังเปิด")).toBeInstanceOf(ArrayBuffer);
  });

  it("cancels old work without caching a late response or deleting a replacement request", async () => {
    const old = deferred(), next = deferred();
    fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const first = loader.prepare("เดิม"); await flush(); loader.cancel();
    const replacement = loader.prepare("เดิม"); await flush();
    expect(await first).toBeNull(); expect(loader.pending.size).toBe(1);
    old.resolve(ok()); await flush(); expect(cache.size).toBe(0);
    next.resolve(ok()); expect(await replacement).toBeInstanceOf(ArrayBuffer);
    expect(cache.size).toBe(1);
  });

  it.each([{}, { audioContent: "!invalid!" }])("rejects missing or corrupt audio safely: %s", async data => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => data });
    expect(await loader.prepare("ทดสอบ")).toBeNull();
    expect(cache.size).toBe(0); expect(loader.pending.size).toBe(0);
  });

  it("keeps credentials and remote error text out of diagnostics", async () => {
    fetchMock.mockResolvedValue(error(403, "secret key-a unsafe"));
    await loader.prepare("ทดสอบ");
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/secret|key-a/);
    expect(loader.lastError).toBe("HTTP_403");
  });

  it("skips all network activity when disabled or keys are absent", async () => {
    config.enabled = false; expect(await loader.prepare("ทดสอบ")).toBeNull();
    config.enabled = true; config.keys = []; expect(await loader.prepare("ทดสอบ")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks direct loader and request calls in a free build even with legacy config", async () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "false");
    expect(await loader.prepare("ทดสอบ")).toBeNull();
    expect(await loader.request("ทดสอบ", config.voice, "key-a", 100)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
