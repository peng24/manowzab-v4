/**
 * Cloudflare Worker for Microsoft Edge Text-to-Speech (Edge TTS)
 * 
 * 🚀 Deploy on Cloudflare Workers (Free 100,000 requests/day)
 * 🎙️ Default Voice: th-TH-PremwadeeNeural (เสียงเปรมวดี)
 * 
 * How to deploy:
 * 1. Log in to https://dash.cloudflare.com/
 * 2. Go to Workers & Pages -> Create Application -> Create Worker
 * 3. Click Deploy -> Edit Code
 * 4. Paste this entire file -> Click Save and Deploy
 * 5. Copy your worker URL (e.g. https://your-worker.workers.dev)
 */

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
    }
  });
}

function generateUuid() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function generateSecMsGec() {
  const WIN_EPOCH = 11644473600n;
  const S_TO_NS = 10000000n;
  let ticks = BigInt(Math.floor(Date.now() / 1000)) + WIN_EPOCH;
  ticks -= ticks % 300n;
  ticks *= S_TO_NS;
  const strToHash = `${ticks}${TRUSTED_CLIENT_TOKEN}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(strToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function synthesizeEdgeSpeech(text, voice = "th-TH-PremwadeeNeural", rate = "+0%", pitch = "+0Hz") {
  const secMsGec = await generateSecMsGec();
  const connectionId = generateUuid();
  const requestId = generateUuid();
  const timestamp = new Date().toISOString();

  // Cloudflare Workers fetch requires https:// scheme for WebSocket upgrade
  const url = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-133.0.3065.82&ConnectionId=${connectionId}`;

  const wsResponse = await fetch(url, {
    headers: {
      Upgrade: "websocket",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
    },
  });

  const ws = wsResponse.webSocket;
  if (!ws) {
    throw new Error(`Failed WebSocket handshake: HTTP ${wsResponse.status}`);
  }

  ws.accept();

  return new Promise((resolve, reject) => {
    const audioChunks = [];
    const timeout = setTimeout(() => {
      try { ws.close(); } catch (e) {}
      reject(new Error("Edge TTS Timeout (10s limit exceeded)"));
    }, 10000);

    ws.addEventListener("message", async (event) => {
      if (typeof event.data === "string") {
        if (event.data.includes("Path:turn.end")) {
          clearTimeout(timeout);
          try { ws.close(); } catch (e) {}

          let totalLength = 0;
          for (const chunk of audioChunks) totalLength += chunk.length;
          const completeAudio = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            completeAudio.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(completeAudio);
        }
        return;
      }

      let rawBytes;
      if (event.data instanceof ArrayBuffer) {
        rawBytes = new Uint8Array(event.data);
      } else if (event.data instanceof Uint8Array) {
        rawBytes = event.data;
      } else if (event.data && typeof event.data.arrayBuffer === "function") {
        rawBytes = new Uint8Array(await event.data.arrayBuffer());
      }

      if (rawBytes && rawBytes.length >= 2) {
        const headerLength = (rawBytes[0] << 8) | rawBytes[1];
        if (rawBytes.length > 2 + headerLength) {
          const audioPayload = rawBytes.subarray(2 + headerLength);
          if (audioPayload.length > 0) {
            audioChunks.push(audioPayload);
          }
        }
      }
    });

    ws.addEventListener("error", (err) => {
      clearTimeout(timeout);
      reject(err || new Error("WebSocket error during TTS synthesis"));
    });

    ws.addEventListener("close", () => {
      clearTimeout(timeout);
      if (audioChunks.length > 0) {
        let totalLength = 0;
        for (const chunk of audioChunks) totalLength += chunk.length;
        const completeAudio = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          completeAudio.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(completeAudio);
      }
    });

    // 1. Send speech.config message
    const configMessage =
      `X-Timestamp:${timestamp}\r\n` +
      `Content-Type:application/json; charset=utf-8\r\n` +
      `Path:speech.config\r\n\r\n` +
      JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataOptions: {
                bookmarkEnabled: false,
                sentenceBoundaryEnabled: false,
              },
              outputFormat: "audio-24khz-48kbitrate-mono-mp3",
            },
          },
        },
      });

    ws.send(configMessage);

    // 2. Send SSML message
    const cleanText = escapeXml(text);
    const ssmlMessage =
      `X-RequestId:${requestId}\r\n` +
      `Content-Type:application/ssml+xml\r\n` +
      `X-Timestamp:${timestamp}Z\r\n` +
      `Path:ssml\r\n\r\n` +
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='th-TH'>` +
      `<voice name='${voice}'>` +
      `<prosody pitch='${pitch}' rate='${rate}'>${cleanText}</prosody>` +
      `</voice>` +
      `</speak>`;

    ws.send(ssmlMessage);
  });
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);

    let text = url.searchParams.get("text") || "";
    let voice = url.searchParams.get("voice") || "th-TH-PremwadeeNeural";
    let rate = url.searchParams.get("rate") || "+0%";
    let pitch = url.searchParams.get("pitch") || "+0Hz";

    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.text) text = body.text;
        if (body.voice) voice = body.voice;
        if (body.rate) rate = body.rate;
        if (body.pitch) pitch = body.pitch;
      } catch (e) {
        // Continue with query params
      }
    }

    // Health check endpoint (when no text is provided or explicit /health)
    if (url.pathname === "/health" || (!text && request.method === "GET")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "Manowzab Edge TTS Proxy",
          defaultVoice: "th-TH-PremwadeeNeural",
          supportedVoices: ["th-TH-PremwadeeNeural", "th-TH-NiwatNeural"],
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing 'text' parameter" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    try {
      const audioBytes = await synthesizeEdgeSpeech(text.trim(), voice, rate, pitch);

      return new Response(audioBytes, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || "Synthesis failed" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
