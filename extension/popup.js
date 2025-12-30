const $ = (id) => document.getElementById(id);

function setStatus(text, isError = false) {
  const el = $("status");
  el.textContent = text || "";
  el.classList.toggle("error", Boolean(isError));
}

async function load() {
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!res?.ok) {
    setStatus(res?.error || "설정 불러오기 실패", true);
    return;
  }
  const s = res.settings;
  $("apiKey").value = s.apiKey || "";
  $("model").value = s.model || "gpt-4o-mini";
  $("targetLang").value = s.targetLang || "ko";
  $("batchSize").value = String(s.batchSize || 18);
}

async function save() {
  $("saveBtn").disabled = true;
  setStatus("저장 중...");
  try {
    const settings = {
      apiKey: $("apiKey").value.trim(),
      model: $("model").value.trim() || "gpt-4o-mini",
      targetLang: $("targetLang").value,
      batchSize: Number($("batchSize").value) || 18
    };
    const res = await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings });
    if (!res?.ok) throw new Error(res?.error || "저장 실패");
    setStatus("저장 완료. Vimeo 페이지에서 '번역 시작'을 누르세요.");
  } catch (e) {
    setStatus(e?.message || String(e), true);
  } finally {
    $("saveBtn").disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  load().catch((e) => setStatus(e?.message || String(e), true));
  $("saveBtn").addEventListener("click", () => void save());
});

