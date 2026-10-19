// ==UserScript==
// @name         自动倍速
// @namespace    https://jacket-lai.app.workbuddy.host/
// @version      1.1.0
// @description  自动把网页里所有支持倍速的视频设为 1.5x，不用手点。快捷键 + / - 调节，直播自动跳过。
// @author       Jacket Lai
// @match        *://*/*
// @all-frames
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const DEFAULT_RATE = 1.5;
  const STEP = 0.25;
  const MIN = 0.5;
  const MAX = 3.0;
  const STORE_KEY = 'auto-rate-value';
  let current = (function () {
    try {
      const v = parseFloat(localStorage.getItem(STORE_KEY));
      if (v >= MIN && v <= MAX) return v;
    } catch (e) {}
    return DEFAULT_RATE;
  })();
  let applying = false;
  function save() { try { localStorage.setItem(STORE_KEY, String(current)); } catch (e) {} }
  function apply(v) {
    if (!v || v.tagName !== 'VIDEO') return;
    if (v.duration === Infinity) return;
    if (v.dataset.autoRate) return;
    v.dataset.autoRate = '1';
    const sync = function () {
      if (applying) return;
      if (Math.abs(v.playbackRate - current) > 0.01) {
        applying = true;
        try { v.playbackRate = current; } catch (e) {}
        setTimeout(function () { applying = false; }, 60);
      }
    };
    v.addEventListener('ratechange', sync);
    v.addEventListener('loadedmetadata', sync);
    v.addEventListener('loadeddata', sync);
    sync();
  }
  function allVideos(root, out) {
    root.querySelectorAll('video').forEach(function (v) { out.push(v); });
    root.querySelectorAll('*').forEach(function (el) { if (el.shadowRoot) allVideos(el.shadowRoot, out); });
    return out;
  }
  function scan() { allVideos(document, []).forEach(apply); }
  function change(delta) {
    current = Math.min(MAX, Math.max(MIN, Math.round((current + delta) * 100) / 100));
    save();
    allVideos(document, []).forEach(function (v) {
      if (v.duration === Infinity) return;
      applying = true;
      try { v.playbackRate = current; } catch (e) {}
      setTimeout(function () { applying = false; }, 60);
    });
    scan(); toast(current.toFixed(2) + 'x');
  }
  let toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;background:rgba(20,20,22,.92);color:#fff;padding:9px 14px;border-radius:8px;font:13px/1 sans-serif;opacity:0;transition:opacity .25s;pointer-events:none;';
      (document.body || document.documentElement).appendChild(toastEl);
    }
    toastEl.textContent = '倍速 ' + msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.style.opacity = '0'; }, 1300);
  }
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); change(STEP); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); change(-STEP); }
  }, true);
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(scan, 1500);
  scan();
})();
