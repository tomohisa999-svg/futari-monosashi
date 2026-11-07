"use strict";
(() => {
  const questions = window.sumaiQuestions;
  const el = (id) => document.getElementById(id);
  // 回答はページを開いている間だけメモリに保持する。
  let answers = [];
  let current = 0;
  let timer = null;
  function cancel() { window.clearTimeout(timer); timer = null; }
  function show(screen, title) {
    ["home", "quiz", "done"].forEach((id) => { el(id).hidden = id !== screen; });
    el(title).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function render() {
    cancel();
    const question = questions[current];
    el("count").textContent = `${current + 1} / ${questions.length}`;
    el("progress").setAttribute("aria-valuenow", current + 1);
    el("fill").style.width = `${(current + 1) / questions.length * 100}%`;
    el("question").textContent = question.text;
    el("back").textContent = current === 0 ? "テーマ選びに戻る" : "ひとつ前に戻る";
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
        el("answers").textContent = JSON.stringify(answers);
        show("done", "done-title");
      }
    }, 320);
  }
  function home() { cancel(); show("home", "title"); }
  el("start").addEventListener("click", () => { answers = []; current = 0; render(); });
  el("back").addEventListener("click", () => {
    cancel();
    if (current === 0) home();
    else { current -= 1; render(); }
  });
  el("review").addEventListener("click", render);
  el("home-button").addEventListener("click", home);
})();
