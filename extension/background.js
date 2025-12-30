const DEFAULTS = {
  apiKey: "",
  model: "gpt-4o-mini",
  targetLang: "ko",
  batchSize: 18
};

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Translate an array of strings to target language, returning same-length array.
 * Uses OpenAI Chat Completions (simple + widely supported).
 */
async function translateBatch({ apiKey, model, targetLang, texts }) {
  // 빈 줄은 그대로 유지
  const indexed = texts.map((t, i) => ({ i, t: (t ?? "").toString() }));
  const nonEmpty = indexed.filter((x) => x.t.trim().length > 0);
  if (nonEmpty.length === 0) return texts.map(() => "");

  const system =
    "You are a professional subtitle translator. " +
    "Translate faithfully and naturally. " +
    "Do NOT add explanations. Do NOT merge lines. Keep meaning and tone.";

  const user =
    `Target language: ${targetLang}\n` +
    "Return ONLY valid JSON with this exact shape:\n" +
    '{ "translations": ["...", "..."] }\n' +
    "The translations array must have the same length and order as the input list.\n\n" +
    "Input list:\n" +
    JSON.stringify(nonEmpty.map((x) => x.t));

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`OpenAI API 오류: ${resp.status} ${resp.statusText}\n${text}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "";

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(
      "번역 결과(JSON) 파싱 실패. 모델 응답이 JSON만 반환하지 않았습니다.\n" +
        content.slice(0, 500)
    );
  }
  const translations = parsed?.translations;
  if (!Array.isArray(translations) || translations.length !== nonEmpty.length) {
    throw new Error("번역 결과 형식이 올바르지 않습니다.");
  }

  const out = texts.map(() => "");
  nonEmpty.forEach((x, idx) => {
    out[x.i] = (translations[idx] ?? "").toString();
  });
  return out;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "GET_SETTINGS") {
      const settings = await getSettings();
      sendResponse({ ok: true, settings });
      return;
    }

    if (msg.type === "SAVE_SETTINGS") {
      const next = {
        apiKey: (msg.settings?.apiKey ?? "").toString(),
        model: (msg.settings?.model ?? DEFAULTS.model).toString(),
        targetLang: (msg.settings?.targetLang ?? DEFAULTS.targetLang).toString(),
        batchSize: Number(msg.settings?.batchSize ?? DEFAULTS.batchSize) || DEFAULTS.batchSize
      };
      await chrome.storage.sync.set(next);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "TRANSLATE_BATCH") {
      const settings = await getSettings();
      const apiKey = (msg.apiKey ?? settings.apiKey).toString();
      const model = (msg.model ?? settings.model).toString();
      const targetLang = (msg.targetLang ?? settings.targetLang).toString();
      const texts = Array.isArray(msg.texts) ? msg.texts : [];

      if (!apiKey) {
        sendResponse({ ok: false, error: "OpenAI API Key가 설정되어 있지 않습니다." });
        return;
      }

      // 가벼운 rate-limit 회피
      await sleep(80);
      const translations = await translateBatch({ apiKey, model, targetLang, texts });
      sendResponse({ ok: true, translations });
      return;
    }
  })()
    .then(() => void 0)
    .catch((err) => {
      sendResponse({ ok: false, error: err?.message || String(err) });
    });

  // async sendResponse
  return true;
});

