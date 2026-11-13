"use strict";
(() => {
  const themes = {
    sumai: { name: "住まい", short: "住まい", questions: window.sumaiQuestions },
    okane: { name: "お金の考え方", short: "お金", questions: window.okaneQuestions },
    kosodate: { name: "子育て", short: "子育て", questions: window.kosodateQuestions },
    ryokou: { name: "旅行の計画", short: "旅行", questions: window.ryokouQuestions }
  };
  let themeId = "sumai";
  let questions = themes[themeId].questions;
  let received = null;
  let resultData = null;
  let resultScore = 0;
  let copyTimer = null;
  const el = (id) => document.getElementById(id);
  // 回答はページを開いている間だけメモリに保持する。
  let answers = [];
  let current = 0;
  let timer = null;
  function cancel() { window.clearTimeout(timer); timer = null; }
  function show(screen, title) {
    ["home", "introduce", "quiz", "done", "receive", "result", "invalid"].forEach((id) => { el(id).hidden = id !== screen; });
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
    el("back").textContent = current === 0 ? (received ? "受け取り画面に戻る" : "呼び名の入力に戻る") : "ひとつ前に戻る";
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
          renderResult({ v: 1, t: themeId, n1: received.n1, a1: received.a1,
            n2: nickname("name2"), a2: answers.join("") }, true);
          window.history.replaceState(null, "", resultUrl());
        } else {
          const name = nickname("name1");
          el("done-greeting").textContent = name ? `${name}さん、おつかれさまでした` : "10問、おつかれさまでした";
          show("done", "done-title");
        }
      }
    }, 320);
  }
  function nickname(id) { return el(id).value.trim().slice(0, 10); }
  function home() {
    cancel(); received = null; resultData = null; answers = []; current = 0;
    themeId = "sumai"; questions = themes[themeId].questions;
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    el("name1").value = ""; el("name2").value = "";
    resetCopy(); show("home", "title");
  }
  function begin() { answers = []; current = 0; render(); }
  function shareUrl() {
    const data = { v: 1, t: themeId, n1: nickname("name1"), a1: answers.join("") };
    return encodedUrl(data, "p");
  }
  function encodedUrl(data, kind) {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return window.location.origin + window.location.pathname + "#" + kind + "=" + encoded;
  }
  function resultUrl() { return encodedUrl(resultData, "r"); }
  function node(tag, className, content) {
    const element = document.createElement(tag);
    element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }
  function renderResult(data, justAnswered = false) {
    resultData = data;
    const names = [data.n1 || "1人目", data.n2 || "2人目"];
    el("send-back").hidden = !justAnswered;
    el("send-back-text").textContent = `${data.n1 ? data.n1 + "さん" : "相手"}は、まだこの結果を見ていません。結果を送ってあげましょう。`;
    const rows = questions.map((question, i) => ({ question, a: Number(data.a1[i]), b: Number(data.a2[i]),
      difference: Math.abs(Number(data.a1[i]) - Number(data.a2[i])) }));
    resultScore = Math.round(rows.reduce((sum, row) => sum + [100, 75, 35, 0][row.difference], 0) / rows.length);
    el("result-names").textContent = names.join(" と ");
    el("result-score").textContent = `${resultScore}%`;
    el("result-message").textContent = resultScore >= 80 ? "かなり近い考えのふたりです" : resultScore >= 60 ?
      "だいたい同じ方向。いくつか話しておきたいところがあります" : resultScore >= 40 ?
      "考えがちがうところがはっきりしています。話し合うよい機会に" :
      "見ている景色がけっこうちがうふたり。まずは1つずつ話してみましょう";
    el("result-title").textContent = `ふたりの${themes[themeId].short}のものさし`;
    const groups = [
      { title: "もめそうなところ", label: "もめそう", className: "conflict", rows: rows.filter(row => row.difference === 3) },
      { title: "ちょっとズレ", label: "ちょっとズレ", className: "different", rows: rows.filter(row => row.difference === 2) },
      { title: "合っているところ", label: "合っている", className: "close", rows: rows.filter(row => row.difference <= 1) }
    ];
    el("result-counts").replaceChildren(...[groups[2], groups[1], groups[0]].map(group =>
      node("p", group.className, `${group.label} ${group.rows.length}問`)));
    el("result-groups").replaceChildren();
    groups.forEach((group, index) => {
      if (index === 0 && !group.rows.length) {
        el("result-groups").append(node("p", "no-conflict", "もめそうなところはありませんでした"));
        return;
      }
      if (!group.rows.length) return;
      const section = node("section", `result-group ${group.className}`);
      section.append(node("h3", "group-title", `${group.title}（${group.rows.length}問）`));
      if (index === 0) {
        section.append(node("p", "hint", "上から順に話すのがおすすめ"));
        group.rows.sort((a, b) => a.question.talkOrder - b.question.talkOrder);
      }
      group.rows.forEach(({ question, a, b }) => {
        const card = node("article", "result-card");
        card.append(node("h4", "", question.text));
        const choices = node("div", "result-choices");
        if (index === 2 && a === b) choices.append(node("p", "both-answer", `ふたりとも：${question.options[a]}`));
        else [a, b].forEach((answer, person) => choices.append(node("p", "", `${names[person]}：${question.options[answer]}`)));
        card.append(choices);
        if (index !== 2) {
          const advice = node(index === 0 ? "div" : "details", "result-advice");
          advice.append(node(index === 0 ? "p" : "summary", "advice-title", "歩み寄るなら"), node("p", "", question.advice));
          card.append(advice);
        }
        section.append(card);
      });
      el("result-groups").append(section);
    });
    show("result", "result-title");
  }
  function resetCopy() {
    window.clearTimeout(copyTimer);
    el("copy-status").textContent = ""; el("manual-copy").hidden = true;
    el("share-url").value = "";
    el("result-copy-status").textContent = ""; el("result-manual-copy").hidden = true;
    el("result-share-url").value = "";
  }
  function receive() {
    el("receive-title").textContent = received.n1 ? `${received.n1}さんから届きました` : "ふたりものさしが届きました";
    el("receive-description").textContent = `テーマは「${themes[themeId].name}」。同じ${questions.length}問に答えると、ふたりの結果が見られます。${received.n1 ? received.n1 + "さん" : "1人目"}の答えは、あなたが答え終わるまで見えません。`;
    show("receive", "receive-title");
  }
  function readLink() {
    cancel(); resetCopy(); answers = []; current = 0; received = null; resultData = null;
    if (!window.location.hash) { home(); return; }
    try {
      const match = /^#([pr])=([A-Za-z0-9_-]+)$/.exec(window.location.hash);
      if (!match || match[2].length > 4096) throw new Error("Invalid link");
      const base64 = match[2].replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (!data || data.v !== 1 || !Object.hasOwn(themes, data.t) || typeof data.n1 !== "string" || data.n1.length > 10 ||
          typeof data.a1 !== "string" || !/^[0-3]+$/.test(data.a1) || data.a1.length !== themes[data.t].questions.length) {
        throw new Error("Invalid data");
      }
      received = data; themeId = data.t; questions = themes[themeId].questions;
      if (match[1] === "r") {
        if (typeof data.n2 !== "string" || data.n2.length > 10 || typeof data.a2 !== "string" ||
            !/^[0-3]+$/.test(data.a2) || data.a2.length !== questions.length) throw new Error("Invalid result");
        renderResult(data);
      } else receive();
    } catch { show("invalid", "invalid-title"); }
  }
  function introduce() { show("introduce", "introduce-title"); }
  function pickTheme(id) { themeId = id; questions = themes[themeId].questions; introduce(); }
  document.querySelectorAll("[data-theme]").forEach((button) => button.addEventListener("click", () => pickTheme(button.dataset.theme)));
  el("introduce-start").addEventListener("click", begin);
  el("introduce-home").addEventListener("click", home);
  el("back").addEventListener("click", () => {
    cancel();
    if (current === 0) { if (received) receive(); else introduce(); }
    else { current -= 1; render(); }
  });
  el("review").addEventListener("click", () => { resetCopy(); current = 0; render(); });
  el("home-button").addEventListener("click", home);
  el("fresh-start").addEventListener("click", home);
  el("invalid-home").addEventListener("click", home);
  el("result-home").addEventListener("click", home);
  function sendResultLine() {
    const conflicts = questions.filter((_, i) => Math.abs(Number(resultData.a1[i]) - Number(resultData.a2[i])) === 3).length;
    const message = `${resultData.n2 ? resultData.n2 + "も" : ""}「ふたりものさし（${themes[themeId].name}）」に答えたよ！\n` +
      (conflicts ? "ちょっと話し合いたいところが見つかったよ…結果を見てみて。" : "けっこう合ってたかも。結果を見てみて。") + `\n${resultUrl()}`;
    window.open("https://line.me/R/share?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  }
  el("result-line").addEventListener("click", sendResultLine);
  el("send-back-line").addEventListener("click", sendResultLine);
  el("result-copy").addEventListener("click", () => copyLink(true));
  el("receive-start").addEventListener("click", begin);
  el("name1").addEventListener("input", resetCopy);
  el("line-share").addEventListener("click", () => {
    const name = nickname("name1");
    const message = (name ? `${name}さんが「ふたりものさし（${themes[themeId].name}）」に答えました。` : `ふたりものさし（${themes[themeId].name}）に答えたよ。`) +
      "あなたも答えてみて！答えると、ふたりの結果が見られます。\n" + shareUrl();
    window.open("https://line.me/R/share?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  });
  async function copyLink(isResult = false) {
    resetCopy();
    const url = isResult ? resultUrl() : shareUrl();
    const input = el(isResult ? "result-share-url" : "share-url");
    const manual = el(isResult ? "result-manual-copy" : "manual-copy");
    const status = el(isResult ? "result-copy-status" : "copy-status");
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch { /* 従来のコピー方法へ */ }
    if (!copied) {
      manual.hidden = false;
      input.value = url;
      input.focus(); input.select();
      input.setSelectionRange(0, url.length);
      try { copied = document.execCommand("copy"); } catch { /* 手動でコピーできる入力欄を残す */ }
    }
    if (copied) {
      manual.hidden = true;
      el(isResult ? "result-copy" : "copy-link").focus();
      status.textContent = "コピーしました";
      copyTimer = window.setTimeout(() => { status.textContent = ""; }, 2400);
    } else { status.textContent = "リンクを長押し、または選択してコピーしてください。"; }
  }
  el("copy-link").addEventListener("click", () => copyLink());
  window.addEventListener("hashchange", readLink);
  if (window.location.hash) readLink();
})();
