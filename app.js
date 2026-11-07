"use strict";
(() => {
  const themes = { sumai: { name: "住まい", questions: window.sumaiQuestions } };
  let themeId = "sumai";
  let questions = themes[themeId].questions;
  let received = null;
  let copyTimer = null;
  const el = (id) => document.getElementById(id);
  // 回答はページを開いている間だけメモリに保持する。
  let answers = [];
  let current = 0;
  let timer = null;
  function cancel() { window.clearTimeout(timer); timer = null; }
  function show(screen, title) {
    ["home", "quiz", "done", "receive", "result", "invalid"].forEach((id) => { el(id).hidden = id !== screen; });
    el(title).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function render() {
    cancel();
    const question = questions[current];
    el("count").textContent = `${current + 1} / ${questions.length}`;
    el("progress").setAttribute("aria-valuenow", current + 1);
    el("progress").setAttribute("aria-valuemax", questions.length);
    document.querySelector(".topic").textContent = themes[themeId].name;
    el("fill").style.width = `${(current + 1) / questions.length * 100}%`;
    el("question").textContent = question.text;
    el("back").textContent = current === 0 ? (received ? "受け取り画面に戻る" : "テーマ選びに戻る") : "ひとつ前に戻る";
    el("options").replaceChildren();
    question.options.forEach((label, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(answers[current] === index));
      button.addEventListener("click", () => select(index));
      el("options").append(button);
    });
    show("quiz", "question");
  }
  function select(index) {
    if (timer !== null) return;
    answers[current] = index;
    Array.from(el("options").children).forEach((button, i) => {
      button.setAttribute("aria-pressed", String(i === index));
      button.disabled = true;
    });
    timer = window.setTimeout(() => {
      timer = null;
      if (current < questions.length - 1) { current += 1; render(); }
      else {
        if (received) {
          el("result-name1").textContent = received.n1 || "1人目";
          el("result-name2").textContent = nickname("name2") || "2人目";
          el("result-answers1").textContent = JSON.stringify(Array.from(received.a1, Number));
          el("result-answers2").textContent = JSON.stringify(answers);
          show("result", "result-title");
        } else { show("done", "done-title"); }
      }
    }, 320);
  }
  function nickname(id) { return el(id).value.trim().slice(0, 10); }
  function home() {
    cancel(); received = null; answers = []; current = 0;
    themeId = "sumai"; questions = themes[themeId].questions;
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    el("name1").value = ""; el("name2").value = "";
    resetCopy(); show("home", "title");
  }
  function begin() { answers = []; current = 0; render(); }
  function shareUrl() {
    const data = { v: 1, t: themeId, n1: nickname("name1"), a1: answers.join("") };
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return window.location.origin + window.location.pathname + "#p=" + encoded;
  }
  function resetCopy() {
    window.clearTimeout(copyTimer);
    el("copy-status").textContent = ""; el("manual-copy").hidden = true;
    el("share-url").value = "";
  }
  function receive() {
    el("receive-title").textContent = received.n1 ? `${received.n1}さんから届きました` : "ふたりものさしが届きました";
    el("receive-description").textContent = `テーマは「${themes[themeId].name}」。同じ${questions.length}問に答えると、ふたりの結果が見られます。${received.n1 ? received.n1 + "さん" : "1人目"}の答えは、あなたが答え終わるまで見えません。`;
    show("receive", "receive-title");
  }
  function readLink() {
    cancel(); resetCopy(); answers = []; current = 0; received = null;
    if (!window.location.hash) { home(); return; }
    try {
      const match = /^#p=([A-Za-z0-9_-]+)$/.exec(window.location.hash);
      if (!match || match[1].length > 4096) throw new Error("Invalid link");
      const base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (!data || data.v !== 1 || !Object.hasOwn(themes, data.t) || typeof data.n1 !== "string" || data.n1.length > 10 ||
          typeof data.a1 !== "string" || !/^[0-3]+$/.test(data.a1) || data.a1.length !== themes[data.t].questions.length) {
        throw new Error("Invalid data");
      }
      received = data; themeId = data.t; questions = themes[themeId].questions;
      receive();
    } catch { show("invalid", "invalid-title"); }
  }
  el("start").addEventListener("click", begin);
  el("back").addEventListener("click", () => {
    cancel();
    if (current === 0) { if (received) receive(); else home(); }
    else { current -= 1; render(); }
  });
  el("review").addEventListener("click", () => { resetCopy(); current = 0; render(); });
  el("home-button").addEventListener("click", home);
  el("fresh-start").addEventListener("click", home);
  el("invalid-home").addEventListener("click", home);
  el("receive-start").addEventListener("click", begin);
  el("name1").addEventListener("input", resetCopy);
  el("line-share").addEventListener("click", () => {
    const name = nickname("name1");
    const message = (name ? `${name}さんが「ふたりものさし（住まい）」に答えました。` : "ふたりものさし（住まい）に答えたよ。") +
      "あなたも答えてみて！答えると、ふたりの結果が見られます。\n" + shareUrl();
    window.open("https://line.me/R/share?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  });
  el("copy-link").addEventListener("click", async () => {
    resetCopy();
    const url = shareUrl();
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch { /* 従来のコピー方法へ */ }
    if (!copied) {
      el("manual-copy").hidden = false;
      el("share-url").value = url;
      el("share-url").focus(); el("share-url").select();
      el("share-url").setSelectionRange(0, url.length);
      try { copied = document.execCommand("copy"); } catch { /* 手動でコピーできる入力欄を残す */ }
    }
    if (copied) {
      el("manual-copy").hidden = true;
      el("copy-link").focus();
      el("copy-status").textContent = "コピーしました";
      copyTimer = window.setTimeout(() => { el("copy-status").textContent = ""; }, 2400);
    } else { el("copy-status").textContent = "リンクを長押し、または選択してコピーしてください。"; }
  });
  window.addEventListener("hashchange", readLink);
  if (window.location.hash) readLink();
})();
