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

function jitter(ms) {
  const j = Math.random() * 0.25 + 0.875; // 0.875~1.125
  return Math.floor(ms * j);
}

function extractJsonObject(text) {
  const raw = (text ?? "").toString().trim();
  if (!raw) throw new Error("모델 응답이 비었습니다.");

  // 1) 그대로 JSON 시도
  try {
    return JSON.parse(raw);
  } catch (_) {
    // continue
  }

  // 2) ```json ... ``` 코드펜스 제거
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (_) {
      // continue
    }
  }

  // 3) 첫 { ~ 마지막 } 범위를 JSON으로 파싱 (설명/문구가 섞여도 최대한 복구)
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const slice = raw.slice(first, last + 1);
    return JSON.parse(slice);
  }

  throw new Error("모델 응답에서 JSON 객체를 찾지 못했습니다.");
}

async function fetchJson(url, init) {
  const resp = await fetch(url, init);
  const text = await resp.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    // non-json
  }
  return { resp, text, json };
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

  const items = nonEmpty.map((x) => ({ id: x.i, text: x.t }));

  const user =
    `Target language: ${targetLang}\n` +
    "Return ONLY valid JSON with this exact shape:\n" +
    '{ "translations": [{ "id": 0, "text": "..." }] }\n' +
    "Rules:\n" +
    "- Keep line breaks (\\n) if they exist in the source text.\n" +
    "- Do NOT merge items. Translate each item independently.\n" +
    "- The output must include EXACTLY one object per input item, with the same id.\n\n" +
    "Input items:\n" +
    JSON.stringify(items);

  const body = {
    model,
    temperature: 0.2,
    // 가능하면 JSON 강제(지원 모델/계정에서만 동작). 미지원이면 아래에서 에러 메시지로 확인 가능.
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  };

  async function translateSingleText(text) {
    const singleBody = {
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a professional subtitle translator. Translate faithfully and naturally. " +
            "Return ONLY valid JSON."
        },
        {
          role: "user",
          content:
            `Target language: ${targetLang}\n` +
            'Return ONLY this JSON shape: { "translation": "..." }\n' +
            "Text:\n" +
            JSON.stringify(text)
        }
      ]
    };
    const { resp, text: raw, json } = await fetchJson("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(singleBody)
    });
    if (!resp.ok) {
      const apiMsg = json?.error?.message || "";
      const statusLine = `${resp.status} ${resp.statusText}`.trim();
      throw new Error(`OpenAI API 오류(단건): ${statusLine}\n${apiMsg || raw || ""}`);
    }
    const data = json || {};
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(content);
    return (parsed?.translation ?? "").toString();
  }

  function mapById(translations) {
    const m = new Map();
    for (const it of translations) {
      const id = Number(it?.id);
      const txt = (it?.text ?? "").toString();
      if (Number.isFinite(id)) m.set(id, txt);
    }
    return m;
  }

  let lastErr = null;
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { resp, text, json } = await fetchJson("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const apiMsg = json?.error?.message || "";
        const statusLine = `${resp.status} ${resp.statusText}`.trim();
        const detail = apiMsg || text || "";

        // 재시도 대상: 429, 5xx
        if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
          const wait = jitter(500 * Math.pow(2, attempt - 1));
          lastErr = new Error(`OpenAI API 오류(재시도 ${attempt}/${maxAttempts}): ${statusLine}\n${detail}`);
          await sleep(wait);
          continue;
        }
        throw new Error(`OpenAI API 오류: ${statusLine}\n${detail}`);
      }

      const data = json || {};
      const content = data?.choices?.[0]?.message?.content ?? "";

      let parsed;
      try {
        parsed = extractJsonObject(content);
      } catch (e) {
        throw new Error(
          "번역 결과(JSON) 파싱 실패.\n" +
            (e?.message || String(e)) +
            "\n--- 모델 응답 앞부분 ---\n" +
            content.slice(0, 500)
        );
      }

      const translations = parsed?.translations;
      if (!Array.isArray(translations)) {
        throw new Error("번역 결과 형식이 올바르지 않습니다. (translations 배열 없음)");
      }
      const byId = mapById(translations);
      const missing = nonEmpty.filter((x) => !byId.has(x.i)).map((x) => x.i);
      if (missing.length) {
        throw new Error(
          "번역 결과 형식이 올바르지 않습니다. (translations id 누락)\n" +
            `누락 id: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? "..." : ""}`
        );
      }

      const out = texts.map(() => "");
      nonEmpty.forEach((x) => {
        out[x.i] = (byId.get(x.i) ?? "").toString();
      });
      return out;
    } catch (e) {
      // 네트워크/파싱 등도 1~2회 정도는 재시도
      lastErr = e;
      if (attempt < maxAttempts) {
        await sleep(jitter(400 * Math.pow(2, attempt - 1)));
        continue;
      }
    }
  }

  // 최종 폴백: 단건 번역으로 끝까지 진행(비용/속도는 느리지만, 멈추지 않게)
  try {
    const out = texts.map(() => "");
    for (const x of nonEmpty) {
      out[x.i] = await translateSingleText(x.t);
      await sleep(jitter(120));
    }
    return out;
  } catch (e) {
    throw lastErr || e || new Error("번역 실패(원인 불명)");
  }
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

