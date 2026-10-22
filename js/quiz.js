/* ============================================================
   BST LAB — quiz.js
   8 questions, instant feedback, plain-English explanations.
   ============================================================ */
"use strict";

const Quiz = (() => {

  const QUESTIONS = [
    {
      q: "You're searching for 25 in a BST and you're at a node with value 40. Where do you go?",
      opts: ["Left — 25 is smaller than 40", "Right — you always go right when searching", "Back to the root and start over"],
      a: 0,
      why: "The one rule: smaller values live on the LEFT. 25 < 40, so the answer (if it exists) is in the left subtree. Going right would search only values bigger than 40 — pointless."
    },
    {
      q: "Which traversal visits a BST's values in SORTED order?",
      opts: ["Pre-order", "In-order", "Level-order", "Post-order"],
      a: 1,
      why: "In-order = Left → Node → Right. Recursively that means 'everything smaller, then me, then everything bigger' at every node — which is literally ascending order."
    },
    {
      q: "You insert 10, 20, 30, 40, 50 into an empty BST, in that order. What does the tree look like?",
      opts: ["A perfect bushy tree", "A staircase leaning right — basically a linked list", "A staircase leaning left"],
      a: 1,
      why: "Each new value is bigger than the last, so every insert goes right at every level. You get height 5 for 5 nodes — search degrades to O(n). This is exactly why balanced BSTs exist."
    },
    {
      q: "Roughly how many comparisons to find a value in a BALANCED BST with 1,000,000 items?",
      opts: ["About 1,000,000", "About 1,000", "About 20", "About 100"],
      a: 2,
      why: "Each comparison halves the candidates: log₂(1,000,000) ≈ 20. Doubling the data adds ONE comparison. That's the whole superpower of O(log n)."
    },
    {
      q: "Deleting a node that has TWO children — what replaces it?",
      opts: ["Its left child, always", "The largest value in its LEFT subtree", "The smallest value in its RIGHT subtree (in-order successor)", "Nothing — you can't delete nodes with two children"],
      a: 2,
      why: "The in-order successor is the smallest value that's still bigger than the deleted node — the only value that keeps every left-smaller/right-bigger promise intact. (The largest of the left subtree also works, by symmetry.)"
    },
    {
      q: "Which statement about BSTs is TRUE?",
      opts: ["Every BST is automatically balanced", "The same set of values can form many different BSTs depending on insertion order", "A BST must always be a perfect tree", "BST search is always O(log n)"],
      a: 1,
      why: "Insertion order decides shape: {40,20,60,...} gives a bush; sorted input gives a chain. That's why 'BST search is always O(log n)' is false — only BALANCED BSTs guarantee it."
    },
    {
      q: "Minimum value in a BST — how do you find it?",
      opts: ["Visit every node and track the smallest — O(n)", "Go left from the root until you can't — O(height)", "In-order traversal of the whole tree"],
      a: 1,
      why: "Left is always smaller, so the leftmost node IS the minimum. One clean walk down — O(log n) balanced. (Max is the same story going right.)"
    },
    {
      q: "You need a data structure for exact-key lookups ONLY — never sorted order, never range queries. Best choice?",
      opts: ["Balanced BST", "Hash table", "Sorted array", "Linked list"],
      a: 1,
      why: "Hash tables do get/put in O(1) average. The BST's O(log n) buys you ORDER (ranges, floor/ceiling, sorted output) — if you never use order, you're paying for nothing."
    }
  ];

  let idx = 0, score = 0, answered = false;
  let root = null;

  function start(rootEl) {
    root = rootEl;
    idx = 0; score = 0;
    render();
  }

  function render() {
    if (idx >= QUESTIONS.length) return renderFinal();
    const item = QUESTIONS[idx];
    answered = false;

    root.innerHTML = `
      <div class="quiz-meta">QUESTION ${idx + 1} / ${QUESTIONS.length} &nbsp;·&nbsp; SCORE ${score}</div>
      <div class="quiz-q">${item.q}</div>
      <div class="quiz-opts"></div>
      <div class="quiz-actions">
        <button class="btn" id="quiz-next" disabled>NEXT ▶</button>
        <span class="quiz-score" id="quiz-track"></span>
      </div>`;

    const optsEl = root.querySelector(".quiz-opts");
    item.opts.forEach((text, i) => {
      const b = document.createElement("button");
      b.className = "quiz-opt";
      b.textContent = text;
      b.addEventListener("click", () => pick(i, b));
      optsEl.appendChild(b);
    });

    const next = root.querySelector("#quiz-next");
    next.addEventListener("click", () => { idx++; render(); });
  }

  function pick(i, btn) {
    if (answered) return;
    answered = true;
    const item = QUESTIONS[idx];
    const buttons = root.querySelectorAll(".quiz-opt");
    buttons.forEach(b => b.disabled = true);
    buttons[item.a].classList.add("correct");
    if (i !== item.a) {
      btn.classList.add("wrong");
      root.querySelector("#quiz-track").textContent = "✕ not quite — read why below";
    } else {
      score++;
      root.querySelector("#quiz-track").textContent = "✔ correct";
    }

    const ex = document.createElement("div");
    ex.className = "quiz-explain";
    ex.innerHTML = `<b>WHY:</b> ${item.why}`;
    root.querySelector(".quiz-actions").before(ex);

    root.querySelector("#quiz-next").disabled = false;
    root.querySelector("#quiz-next").textContent = idx === QUESTIONS.length - 1 ? "SEE RESULT ▶" : "NEXT ▶";
  }

  function renderFinal() {
    const pct = Math.round(100 * score / QUESTIONS.length);
    let verdict, note;
    if (score === QUESTIONS.length) { verdict = "FLAWLESS — TREE MASTER"; note = "Perfect run. You can explain BSTs to someone else now — which is the real test."; }
    else if (score >= 6) { verdict = "SOLID — BRANCHES INTACT"; note = "Strong understanding. Skim the sections you missed and you're interview-ready."; }
    else if (score >= 4) { verdict = "ROOTS FORMING"; note = "The core ideas are landing. Re-run the Playground: insert, search, delete a two-child node, watch the step log."; }
    else { verdict = "REPLANT RECOMMENDED"; note = "Go back to Basics, take it slow, and play with the Playground — manipulating a real tree beats re-reading text."; }
    root.innerHTML = `
      <div class="quiz-final">
        <div class="quiz-meta">RUN COMPLETE</div>
        <div class="big-score">${score} / ${QUESTIONS.length}</div>
        <div class="verdict">${verdict}</div>
        <p>${note}</p>
        <div class="quiz-actions" style="justify-content:center">
          <button class="btn" id="quiz-retry">↺ RETRY QUIZ</button>
          <a class="btn ghost" href="#playground" style="text-decoration:none; display:inline-block; line-height:1.2">OPEN PLAYGROUND</a>
        </div>
      </div>`;
    root.querySelector("#quiz-retry").addEventListener("click", () => start(root));
  }

  return { start };
})();
