let state = {
  running: false,
  cues: [],
  translated: new Map(), // cueIndex -> translated text
  vttUrl: null,
  vttTextCaptured: null,
  progress: { done: 0, total: 0 },
  lastCueIndex: -1
};

function $(sel, root = document) {
  return root.querySelector(sel);
}

function createEl(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  Object.assign(el, props);
  for (const c of children) el.appendChild(c);
  return el;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatPct(done, total) {
  if (!total) return "0%";
  return `${Math.floor((done / total) * 100)}%`;
}

function ensureOverlay() {
  if ($("#vtt-translate-overlay")) return;

  const style = createEl("style", {
    textContent: `
      #vtt-translate-overlay {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        width: 360px;
        color: #fff;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      #vtt-translate-panel {
        background: rgba(0,0,0,0.78);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        padding: 12px;
        backdrop-filter: blur(10px);
      }
      #vtt-translate-title {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap: 8px;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      #vtt-translate-btn {
        border: 0;
        border-radius: 10px;
        padding: 8px 10px;
        background: #1f6feb;
        color: #fff;
        cursor: pointer;
        font-weight: 700;
        font-size: 12px;
      }
      #vtt-translate-btn[disabled] {
        opacity: 0.6;
        cursor: default;
      }
      #vtt-translate-sub {
        margin-top: 10px;
        padding: 10px;
        border-radius: 12px;
        background: rgba(0,0,0,0.55);
        border: 1px solid rgba(255,255,255,0.1);
        font-size: 16px;
        line-height: 1.35;
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        min-height: 44px;
      }
      #vtt-translate-meta {
        font-size: 12px;
        color: rgba(255,255,255,0.85);
        line-height: 1.35;
      }
      #vtt-translate-progress {
        height: 8px;
        background: rgba(255,255,255,0.15);
        border-radius: 999px;
        overflow: hidden;
        margin-top: 8px;
      }
      #vtt-translate-progress > div {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #1f6feb, #2ea043);
      }
      #vtt-translate-error {
        margin-top: 8px;
        font-size: 12px;
        color: #ffb4b4;
        white-space: pre-wrap;
      }
      #vtt-translate-actions {
        display:flex;
        gap: 8px;
        margin-top: 10px;
      }
      .vtt-ghost {
        background: transparent;
        color: rgba(255,255,255,0.85);
        border: 1px solid rgba(255,255,255,0.16);
      }
    `
  });

  const btn = createEl("button", { id: "vtt-translate-btn", textContent: "번역 시작" });
  const stopBtn = createEl("button", {
    className: "vtt-ghost",
    textContent: "중지",
    title: "번역/표시 중지"
  });
  stopBtn.style.cssText =
    "border-radius:10px;padding:8px 10px;font-weight:700;font-size:12px;cursor:pointer;";

  const title = createEl(
    "div",
    { id: "vtt-translate-title" },
    [
      createEl("div", { textContent: "Vimeo 자막 번역" }),
      createEl("div", {}, [btn])
    ]
  );

  const meta = createEl("div", { id: "vtt-translate-meta", textContent: "VTT 탐색 중..." });
  const bar = createEl("div", { id: "vtt-translate-progress" }, [createEl("div")]);
  const err = createEl("div", { id: "vtt-translate-error" });
  const sub = createEl("div", { id: "vtt-translate-sub", textContent: "" });

  const actions = createEl("div", { id: "vtt-translate-actions" }, [stopBtn]);
  actions.style.display = "none";

  const panel = createEl("div", { id: "vtt-translate-panel" }, [title, meta, bar, err, sub, actions]);
  const overlay = createEl("div", { id: "vtt-translate-overlay" }, [style, panel]);
  document.documentElement.appendChild(overlay);

  btn.addEventListener("click", () => void onStartClicked());
  stopBtn.addEventListener("click", () => stopAll());
}

function injectPageHookOnce() {
  if (window.__vimeoVttHookInjected) return;
  window.__vimeoVttHookInjected = true;
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("pageHook.js");
    s.async = false;
    (document.documentElement || document.head).appendChild(s);
    s.remove();
  } catch (_) {
    // ignore
  }

  window.addEventListener("message", (ev) => {
    const d = ev?.data;
    if (!d || d.__vimeoVttHook !== true) return;
    if (d.type === "VTT_CAPTURED" && typeof d.text === "string") {
      state.vttTextCaptured = d.text;
      state.vttUrl = d.url || state.vttUrl;
      const len = d.text.length;
      setMeta(`VTT 캡처됨(${len.toLocaleString()} chars). '번역 시작'을 누르세요.`);
    }
  });
}

function setMeta(text) {
  const el = $("#vtt-translate-meta");
  if (el) el.textContent = text || "";
}

function setError(text) {
  const el = $("#vtt-translate-error");
  if (el) el.textContent = text || "";
}

function setProgress(done, total) {
  const bar = $("#vtt-translate-progress > div");
  if (!bar) return;
  const pct = total ? clamp((done / total) * 100, 0, 100) : 0;
  bar.style.width = `${pct}%`;
}

function setButtonRunning(running) {
  const btn = $("#vtt-translate-btn");
  if (!btn) return;
  btn.disabled = running;
  btn.textContent = running ? "번역 중..." : "번역 시작";
  const actions = $("#vtt-translate-actions");
  if (actions) actions.style.display = running ? "flex" : "none";
}

function setSubtitle(text) {
  const el = $("#vtt-translate-sub");
  if (el) el.textContent = text || "";
}

function getVideoEl() {
  // Vimeo는 iframe도 많지만 vimeo.com 페이지 자체 플레이어에선 video 요소가 있음
  const v = document.querySelector("video");
  return v || null;
}

function parseTimestamp(ts) {
  // WEBVTT timestamp:
  // - hh:mm:ss.mmm
  // - mm:ss.mmm
  const raw = ts.trim();
  let m = raw.match(/^(\d+):(\d{2}):(\d{2})(\.\d+)?$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    const s = Number(m[3]);
    const frac = m[4] ? Number(m[4]) : 0; // ".325" -> 0.325
    return h * 3600 + min * 60 + s + frac;
  }
  m = raw.match(/^(\d{2}):(\d{2})(\.\d+)?$/);
  if (m) {
    const min = Number(m[1]);
    const s = Number(m[2]);
    const frac = m[3] ? Number(m[3]) : 0;
    return min * 60 + s + frac;
  }
  return null;
}

function parseVtt(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const cues = [];
  let i = 0;

  // skip header
  if (lines[i]?.startsWith("WEBVTT")) {
    while (i < lines.length && lines[i].trim() !== "") i++;
  }
  while (i < lines.length) {
    // skip empty
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i >= lines.length) break;

    // optional cue id/number
    let maybe = lines[i].trim();
    if (maybe && !maybe.includes("-->") && lines[i + 1]?.includes("-->")) i++;

    const timeLine = (lines[i] || "").trim();
    const tm = timeLine.match(/^(.+?)\s+-->\s+(.+?)(\s+.*)?$/);
    if (!tm) {
      i++;
      continue;
    }
    const start = parseTimestamp(tm[1]);
    const end = parseTimestamp(tm[2]);
    i++;
    const textLines = [];
    while (i < lines.length && lines[i].trim() !== "") {
      textLines.push(lines[i]);
      i++;
    }
    if (start != null && end != null) {
      cues.push({
        start,
        end,
        text: textLines.join("\n").trim()
      });
    }
  }
  return cues;
}

async function discoverVttUrl() {
  // 1) HTML5 track에서 찾기
  const tracks = Array.from(document.querySelectorAll("track[kind='subtitles'], track[kind='captions']"));
  for (const t of tracks) {
    const src = t.getAttribute("src") || "";
    if (src.includes(".vtt")) return new URL(src, location.href).toString();
  }

  // 2) Vimeo가 JS로 붙이는 경우를 위해 텍스트에서 vtt 링크를 탐색(가벼운 휴리스틱)
  const html = document.documentElement.innerHTML;
  const m = html.match(/https?:\/\/[^"' ]+\.vtt[^"' ]*/i);
  if (m?.[0]) return m[0];

  return null;
}

function buildCacheKey({ vttUrl, targetLang, model }) {
  return `vttcache::${targetLang}::${model}::${vttUrl}`;
}

async function loadCachedTranslation({ vttUrl, targetLang, model }) {
  const key = buildCacheKey({ vttUrl, targetLang, model });
  const res = await chrome.storage.local.get({ [key]: null });
  return res[key];
}

async function saveCachedTranslation({ vttUrl, targetLang, model, data }) {
  const key = buildCacheKey({ vttUrl, targetLang, model });
  await chrome.storage.local.set({ [key]: data });
}

function getCurrentCueIndex(cues, t) {
  // binary search by start time, then validate end
  let lo = 0;
  let hi = cues.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (ans >= 0 && t <= cues[ans].end) return ans;
  return -1;
}

function startSubtitleSync() {
  const video = getVideoEl();
  if (!video) {
    setMeta("video 요소를 찾지 못했습니다. (Vimeo iframe/구조에 따라 제한될 수 있어요)");
    return;
  }
  const onTick = () => {
    if (!state.cues.length) return;
    const idx = getCurrentCueIndex(state.cues, video.currentTime);
    if (idx === state.lastCueIndex) return;
    state.lastCueIndex = idx;
    if (idx < 0) {
      setSubtitle("");
      return;
    }
    const tr = state.translated.get(idx);
    if (tr && tr.trim()) setSubtitle(tr);
    else setSubtitle(state.cues[idx].text ? `${state.cues[idx].text}\n(번역 중...)` : "(번역 중...)");
  };
  video.addEventListener("timeupdate", onTick);
  video.addEventListener("seeked", onTick);
  onTick();
}

function stopAll() {
  state.running = false;
  setButtonRunning(false);
  setMeta("중지됨");
  // 에러 원인 파악을 위해 error는 지우지 않음
}

async function onStartClicked() {
  ensureOverlay();
  injectPageHookOnce();
  setError("");

  const settingsRes = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!settingsRes?.ok) {
    setError(settingsRes?.error || "설정 불러오기 실패");
    return;
  }
  const settings = settingsRes.settings;
  if (!settings.apiKey) {
    setError("OpenAI API Key가 없습니다. 확장 아이콘 클릭 → API Key 저장 후 다시 시도하세요.");
    return;
  }

  setButtonRunning(true);
  state.running = true;
  state.translated = new Map();
  state.lastCueIndex = -1;

  setMeta("VTT 찾는 중...");
  const vttUrl = await discoverVttUrl();
  // 1) DOM/HTML에서 찾았으면 그 URL로 fetch 시도
  // 2) 못 찾았으면 페이지 훅(fetch/XHR)로 캡처된 VTT 본문을 사용(DevTools에서 보이는 케이스 대응)
  let vttText = "";
  if (vttUrl) {
    state.vttUrl = vttUrl;
    setMeta("VTT 다운로드 중...");
    try {
      const resp = await fetch(vttUrl);
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      vttText = await resp.text();
    } catch (e) {
      // CORS 등으로 fetch가 막혔으면 캡처본으로 fallback
      if (state.vttTextCaptured) {
        vttText = state.vttTextCaptured;
        setMeta("VTT 다운로드 실패 → 캡처된 VTT로 진행");
      } else {
        setButtonRunning(false);
        state.running = false;
        setError(`VTT 다운로드 실패: ${e?.message || String(e)}\nURL: ${vttUrl}`);
        return;
      }
    }
  } else if (state.vttTextCaptured) {
    vttText = state.vttTextCaptured;
    setMeta("캡처된 VTT로 진행");
  } else {
    setButtonRunning(false);
    state.running = false;
    setError(
      "VTT URL을 찾지 못했습니다.\n" +
        "다만 DevTools 네트워크에는 보인다고 하셨으니, 아래 순서로 다시 해보세요:\n" +
        "1) 이 메시지가 뜬 상태에서 영상 자막(CC)을 켜거나\n" +
        "2) 페이지를 새로고침(F5)해서 VTT 요청이 다시 발생하도록\n\n" +
        "확장이 fetch/XHR을 가로채서 VTT를 캡처하면 'VTT 캡처됨'으로 상태가 바뀝니다."
    );
    return;
  }

  const cues = parseVtt(vttText);
  if (!cues.length) {
    setButtonRunning(false);
    state.running = false;
    setError("VTT 파싱 결과 cue가 0개입니다. (VTT 형식이 표준과 다를 수 있어요)");
    return;
  }
  state.cues = cues;
  state.progress = { done: 0, total: cues.length };
  setProgress(0, cues.length);

  // 캐시 로드
  const cached = await loadCachedTranslation({
    vttUrl,
    targetLang: settings.targetLang,
    model: settings.model
  });
  if (cached?.translations && Array.isArray(cached.translations) && cached.translations.length === cues.length) {
    cached.translations.forEach((t, idx) => state.translated.set(idx, t || ""));
    state.progress.done = cues.length;
    setProgress(cues.length, cues.length);
    setMeta(`캐시 사용: 번역 완료 (${cues.length}/${cues.length})`);
    startSubtitleSync();
    setButtonRunning(false);
    state.running = false;
    return;
  }

  setMeta(`번역 준비: ${cues.length}개 cue`);
  startSubtitleSync();

  const batchSize = clamp(Number(settings.batchSize) || 18, 5, 60);
  const translationsArr = new Array(cues.length).fill("");

  for (let offset = 0; offset < cues.length; offset += batchSize) {
    if (!state.running) return; // stop
    const batch = cues.slice(offset, offset + batchSize).map((c) => c.text);
    setMeta(`번역 중... ${offset}/${cues.length} (${formatPct(offset, cues.length)})`);

    const res = await chrome.runtime.sendMessage({
      type: "TRANSLATE_BATCH",
      texts: batch,
      apiKey: settings.apiKey,
      model: settings.model,
      targetLang: settings.targetLang
    });
    if (!res?.ok) {
      setError(res?.error || "번역 실패");
      stopAll();
      return;
    }
    const tr = res.translations || [];
    tr.forEach((t, i) => {
      const idx = offset + i;
      translationsArr[idx] = t || "";
      state.translated.set(idx, t || "");
    });
    state.progress.done = Math.min(offset + batch.length, cues.length);
    setProgress(state.progress.done, state.progress.total);
  }

  setMeta(`번역 완료 (${cues.length}/${cues.length})`);
  setProgress(cues.length, cues.length);
  await saveCachedTranslation({
    vttUrl,
    targetLang: settings.targetLang,
    model: settings.model,
    data: { translations: translationsArr, savedAt: Date.now() }
  });
  setButtonRunning(false);
  state.running = false;
}

// 초기 부팅: 오버레이는 부담이어서, 영상 있는 페이지만 가볍게 준비
function boot() {
  // Vimeo는 iframe(player.vimeo.com)에서 재생되는 경우가 많음.
  // all_frames로 주입되므로, "video가 있는 프레임"에서만 UI를 띄운다.
  injectPageHookOnce();
  const hasVideo = Boolean(getVideoEl());
  if (!hasVideo) return;

  ensureOverlay();
  discoverVttUrl()
    .then((url) => {
      if (url) setMeta("VTT 감지됨. '번역 시작'을 누르세요.");
      else setMeta("VTT 미감지. 자막을 켠 뒤 다시 시도하세요. (필요 시 새로고침)");
    })
    .catch(() => setMeta("VTT 탐색 실패"));
}

boot();

