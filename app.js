(() => {
  "use strict";
  const bank = window.QUESTION_BANK;
  const app = document.getElementById("app");
  const dialog = document.getElementById("feedback-dialog");
  const dialogBody = document.getElementById("feedback-body");
  const storageKey = "study-loop-v1";
  const letters = ["A", "B", "C", "D"];

  if (!bank || !bank.subjects || !bank.subjects.physics || !bank.subjects.business) {
    app.innerHTML = '<p class="loading">The question bank could not load. Please refresh the page.</p>';
    return;
  }

  const fresh = () => ({
    screen: "home",
    subject: "physics",
    topic: "All topics",
    stats: { total: 0, correct: 0, streak: 0, seen: {}, missed: [] },
    session: null
  });

  let state = fresh();
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored && stored.stats && Array.isArray(stored.stats.missed) && stored.stats.seen) {
      state = Object.assign(fresh(), stored);
      if (!bank.subjects[state.subject]) state.subject = "physics";
      if (state.screen === "quiz" && !state.session) state.screen = "home";
    }
  } catch (_) { /* Continue with an in-memory session if storage is unavailable. */ }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function questionsFor(subject) {
    return bank.subjects[subject].questions;
  }

  function currentQuestion() {
    if (!state.session) return null;
    return questionsFor(state.session.subject).find((q) => q.id === state.session.ids[state.session.position]);
  }

  function missedCount(subject) {
    const ids = new Set(questionsFor(subject).map((q) => q.id));
    return state.stats.missed.filter((id) => ids.has(id)).length;
  }

  function subjectIcon(subject) {
    if (subject === "physics") return '<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(-35 16 16)"/><ellipse cx="16" cy="16" rx="13" ry="5.5" transform="rotate(35 16 16)"/><circle cx="16" cy="16" r="2" fill="currentColor" stroke="none"/></svg>';
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 25V7m0 18h23M9 21l6-7 5 4 7-10"/><path d="M23 8h4v4"/></svg>';
  }

  function renderHome() {
    const subject = state.subject;
    const item = bank.subjects[subject];
    if (state.topic !== "All topics" && !item.topics.includes(state.topic)) state.topic = "All topics";
    const pool = item.questions.filter((q) => state.topic === "All topics" || q.topic === state.topic);
    const accuracy = state.stats.total ? Math.round(100 * state.stats.correct / state.stats.total) + "%" : "—";
    const resume = state.session && state.screen !== "result" && state.session.position < state.session.ids.length;
    const topics = ["All topics", ...item.topics].map((topic) =>
      '<button type="button" class="topic-chip" data-action="topic" data-value="' + esc(topic) + '" aria-pressed="' + (state.topic === topic) + '">' + esc(topic) + '</button>'
    ).join("");
    app.innerHTML =
      '<div class="home-layout">' +
        '<section class="home-intro" aria-labelledby="home-title">' +
          '<p class="eyebrow">Small sessions. Clearer thinking.</p>' +
          '<h1 id="home-title" class="hero-title">Learn from <em>every</em> answer.</h1>' +
          '<p class="lead">Pick a subject, tap an answer, and see the reasoning straight away. Each round draws questions from the bank in a fresh order.</p>' +
          '<div class="how-it-works"><span class="mini-spark" aria-hidden="true">✳</span><span>Get it wrong? You’ll see what that choice misses, the right answer, and the steps to work it out.</span></div>' +
          '<div class="stats-row" aria-label="Your progress">' +
            '<div class="stat"><strong>' + state.stats.total + '</strong><span>answered</span></div>' +
            '<div class="stat"><strong>' + accuracy + '</strong><span>accuracy</span></div>' +
            '<div class="stat"><strong>' + state.stats.streak + '</strong><span>current streak</span></div>' +
          '</div>' +
        '</section>' +
        '<section class="practice-panel" aria-labelledby="pick-heading">' +
          '<div class="panel-top"><h2 id="pick-heading">Start practising</h2><span>Introductory GCSE topics</span></div>' +
          (resume ? '<div class="resume-strip"><span>There’s a round in progress.</span><button type="button" data-action="resume">Resume round →</button></div>' : '') +
          '<div class="subjects" role="group" aria-label="Subject">' +
            ['physics', 'business'].map((key) => '<button type="button" class="subject ' + key + '" data-action="subject" data-value="' + key + '" aria-pressed="' + (subject === key) + '"><span class="subject-icon">' + subjectIcon(key) + '</span><strong>' + esc(bank.subjects[key].label) + '</strong><small>' + bank.subjects[key].questions.length + ' practice questions</small></button>').join("") +
          '</div>' +
          '<div class="topic-label"><strong>Choose a topic</strong><span>' + pool.length + ' available</span></div>' +
          '<div class="topic-list" role="group" aria-label="Topic">' + topics + '</div>' +
          '<div class="panel-actions">' +
            '<button type="button" class="primary-button" data-action="start">Start a ' + Math.min(10, pool.length) + '-question round <span aria-hidden="true">→</span></button>' +
            '<button type="button" class="secondary-button" data-action="review" ' + (missedCount(subject) ? '' : 'disabled') + '>Review mistakes (' + missedCount(subject) + ')</button>' +
          '</div>' +
          '<p class="panel-note">Questions are original and aligned to AQA topics; they are not copied from past papers.</p>' +
        '</section>' +
      '</div>';
  }

  function renderQuestion() {
    const session = state.session;
    const q = currentQuestion();
    if (!q) {
      state.screen = "home";
      state.session = null;
      save();
      renderHome();
      return;
    }
    const selected = session.selected;
    const answers = q.choices.map((choice, index) => {
      const status = session.answered ? (index === q.correctIndex ? " is-correct" : selected === index ? " is-wrong" : "") : "";
      return '<button type="button" class="answer' + status + '" data-action="answer" data-value="' + index + '"' + (session.answered ? ' disabled' : '') + '><span class="answer-letter">' + letters[index] + '</span><span>' + esc(choice) + '</span></button>';
    }).join("");
    app.innerHTML =
      '<div class="quiz-wrap">' +
        '<div class="quiz-top"><button type="button" class="back-button" data-action="home">← Home</button><span class="quiz-label">' + (session.mode === "review" ? "Review mistakes" : "Practice round") + ' · ' + esc(bank.subjects[session.subject].label) + '</span></div>' +
        '<div class="progress-track" role="progressbar" aria-label="Round progress" aria-valuemin="0" aria-valuemax="' + session.ids.length + '" aria-valuenow="' + session.position + '"><div class="progress-fill" style="width:' + (100 * (session.position + (session.answered ? 1 : 0)) / session.ids.length) + '%"></div></div>' +
        '<article class="question-card" aria-labelledby="question-title">' +
          '<div class="question-meta"><span class="meta-pill ' + (session.subject === "business" ? "business" : "") + '">' + esc(q.topic) + '</span><span class="quiz-label">Question ' + (session.position + 1) + ' of ' + session.ids.length + '</span></div>' +
          '<h1 id="question-title">' + esc(q.prompt) + '</h1>' +
          '<div class="answers" role="group" aria-label="Answer choices">' + answers + '</div>' +
          (session.answered ? '<button type="button" class="secondary-button review-inline" data-action="feedback">See explanation</button>' : '') +
        '</article>' +
        '<div class="question-footer"><span>Choose the answer you think is right. It’s fine to make a mistake.</span><span>' + session.correct + ' correct so far</span></div>' +
      '</div>';
  }

  function renderResult() {
    const session = state.session;
    if (!session) { state.screen = "home"; renderHome(); return; }
    const perfect = session.correct === session.ids.length;
    app.innerHTML =
      '<section class="result" aria-labelledby="result-title">' +
        '<div class="result-orbit" aria-hidden="true">' + (perfect ? '✦' : '↗') + '</div>' +
        '<p class="eyebrow">Round complete</p>' +
        '<h1 id="result-title">' + (perfect ? 'A clean sweep.' : 'Keep the loop going.') + '</h1>' +
        '<p class="result-score">' + session.correct + ' of ' + session.ids.length + ' correct</p>' +
        '<p>' + (perfect ? 'Nicely reasoned. A new round will bring you more questions.' : 'The explanations are the useful part. Review your mistakes, then try another round.') + '</p>' +
        '<div class="result-actions"><button type="button" class="primary-button" data-action="start">Try another round →</button><button type="button" class="secondary-button" data-action="home">Choose a subject</button></div>' +
      '</section>';
  }

  function render() {
    if (state.screen === "quiz") renderQuestion();
    else if (state.screen === "result") renderResult();
    else renderHome();
  }

  function startSession(mode) {
    const subject = state.subject;
    const questions = questionsFor(subject);
    let pool = questions.filter((q) => mode === "review"
      ? state.stats.missed.includes(q.id)
      : state.topic === "All topics" || q.topic === state.topic);
    if (!pool.length) return false;
    pool = shuffle(pool).sort((a, b) => (state.stats.seen[a.id] || 0) - (state.stats.seen[b.id] || 0));
    const ids = pool.slice(0, 10).map((q) => q.id);
    ids.forEach((id) => { state.stats.seen[id] = (state.stats.seen[id] || 0) + 1; });
    state.session = { subject, topic: state.topic, mode, ids, position: 0, correct: 0, answered: false, selected: null };
    state.screen = "quiz";
    save();
    render();
    return true;
  }

  function showFeedback() {
    const q = currentQuestion();
    if (!q || !state.session || !state.session.answered) return;
    const chosen = state.session.selected;
    const correct = chosen === q.correctIndex;
    const nextLabel = state.session.position + 1 === state.session.ids.length ? "See my results" : "Next question";
    dialogBody.innerHTML =
      '<div class="feedback-content">' +
        '<div class="feedback-icon ' + (correct ? "correct" : "") + '" aria-hidden="true">' + (correct ? '✓' : '↗') + '</div>' +
        '<p class="feedback-kicker">' + (correct ? 'Correct answer' : 'Let’s work through it') + '</p>' +
        '<h2 id="feedback-title">' + (correct ? 'You got it.' : 'Not quite — here’s why.') + '</h2>' +
        (correct ? '' : '<div class="feedback-box wrong"><strong>You chose: ' + letters[chosen] + ' · ' + esc(q.choices[chosen]) + '</strong><p>' + esc(q.wrongFeedback[chosen]) + '</p></div>') +
        '<div class="feedback-box right"><strong>Correct answer</strong><p class="correct-answer">' + letters[q.correctIndex] + ' · ' + esc(q.choices[q.correctIndex]) + '</p></div>' +
        '<div class="feedback-box"><strong>How to work it out</strong><p>' + esc(q.explanation) + '</p></div>' +
        '<button type="button" class="primary-button" id="next-question">' + nextLabel + ' →</button>' +
      '</div>';
    if (!dialog.open) dialog.showModal();
    document.getElementById("next-question").focus();
  }

  function answer(index) {
    const q = currentQuestion();
    if (!q || state.session.answered || index < 0 || index >= q.choices.length) return false;
    const correct = index === q.correctIndex;
    state.session.answered = true;
    state.session.selected = index;
    state.stats.total++;
    if (correct) {
      state.session.correct++;
      state.stats.correct++;
      state.stats.streak++;
      if (state.session.mode === "review") state.stats.missed = state.stats.missed.filter((id) => id !== q.id);
    } else {
      state.stats.streak = 0;
      if (!state.stats.missed.includes(q.id)) state.stats.missed.push(q.id);
    }
    save();
    renderQuestion();
    showFeedback();
    return true;
  }

  function nextQuestion() {
    if (!state.session || !state.session.answered) return;
    dialog.close();
    state.session.position++;
    state.session.answered = false;
    state.session.selected = null;
    if (state.session.position >= state.session.ids.length) state.screen = "result";
    save();
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  document.addEventListener("click", (event) => {
    const next = event.target.closest("#next-question");
    if (next) { nextQuestion(); return; }
    const brand = event.target.closest(".brand");
    if (brand) {
      event.preventDefault();
      if (dialog.open) dialog.close();
      state.screen = "home"; save(); render(); return;
    }
    const control = event.target.closest("[data-action]");
    if (!control || !app.contains(control)) return;
    const action = control.dataset.action;
    if (action === "subject") {
      state.subject = control.dataset.value;
      state.topic = "All topics";
      save(); render();
    } else if (action === "topic") {
      state.topic = control.dataset.value;
      save(); render();
    } else if (action === "start") startSession("practice");
    else if (action === "review") startSession("review");
    else if (action === "resume" && state.session) { state.screen = "quiz"; save(); render(); if (state.session.answered) showFeedback(); }
    else if (action === "home") { state.screen = "home"; save(); render(); }
    else if (action === "answer") answer(Number(control.dataset.value));
    else if (action === "feedback") showFeedback();
  });

  dialog.addEventListener("cancel", (event) => event.preventDefault());

  render();
  if (state.screen === "quiz" && state.session && state.session.answered) setTimeout(showFeedback, 0);
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();

