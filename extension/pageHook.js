// 페이지 컨텍스트에서 실행됩니다(콘텐츠 스크립트와 분리).
// Vimeo가 fetch/XHR로 받아오는 VTT를 가로채서 window.postMessage로 전달합니다.

(() => {
  const MAX_VTT_CHARS = 250_000; // 과도한 payload 방지

  function looksLikeVtt(text) {
    const t = (text ?? "").toString();
    if (!t) return false;
    // WEBVTT 헤더가 없더라도 일부는 있을 수 있지만, 우선 강하게 체크
    if (/^\s*WEBVTT/i.test(t)) return true;
    // 타임라인 패턴도 보조로 체크
    if (/\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/.test(t)) return true;
    if (/\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}\.\d{3}/.test(t)) return true;
    return false;
  }

  function postVtt(url, text) {
    try {
      const clipped = text.length > MAX_VTT_CHARS ? text.slice(0, MAX_VTT_CHARS) : text;
      window.postMessage(
        {
          __vimeoVttHook: true,
          type: "VTT_CAPTURED",
          url: url || null,
          text: clipped
        },
        "*"
      );
    } catch (_) {
      // ignore
    }
  }

  // --- fetch hook ---
  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = async (...args) => {
      const resp = await origFetch(...args);
      try {
        const url = (args?.[0] && typeof args[0] === "string" ? args[0] : args?.[0]?.url) || resp.url || "";
        const ct = resp.headers?.get?.("content-type") || "";
        if (/vtt/i.test(ct) || /\.vtt(\?|$)/i.test(url) || /vtt/i.test(url)) {
          const clone = resp.clone();
          const text = await clone.text().catch(() => "");
          if (looksLikeVtt(text)) postVtt(url, text);
        }
      } catch (_) {
        // ignore
      }
      return resp;
    };
  }

  // --- XHR hook ---
  const OrigXHR = window.XMLHttpRequest;
  if (typeof OrigXHR === "function") {
    const origOpen = OrigXHR.prototype.open;
    const origSend = OrigXHR.prototype.send;

    OrigXHR.prototype.open = function (method, url, ...rest) {
      try {
        this.__vttUrl = url;
      } catch (_) {}
      return origOpen.call(this, method, url, ...rest);
    };

    OrigXHR.prototype.send = function (...args) {
      try {
        this.addEventListener("load", () => {
          try {
            const url = this.__vttUrl || "";
            const ct = this.getResponseHeader?.("content-type") || "";
            if (!(/vtt/i.test(ct) || /\.vtt(\?|$)/i.test(url) || /vtt/i.test(url))) return;
            if (this.responseType && this.responseType !== "" && this.responseType !== "text") return;
            const text = this.responseText || "";
            if (looksLikeVtt(text)) postVtt(url, text);
          } catch (_) {
            // ignore
          }
        });
      } catch (_) {
        // ignore
      }
      return origSend.apply(this, args);
    };
  }
})();

