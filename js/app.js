/* ============================================================
   BST LAB — app.js
   Wires all sections: anatomy, valid/invalid, halving demo,
   operation walkthroughs, playground, traversals, code viewer.
   ============================================================ */
"use strict";

const App = (() => {

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ============================================================
     01 — ANATOMY (hover/tap any node)
     ============================================================ */
  const ANATOMY = {
    50: ["ROOT", "The top node — every search starts here. No parent."],
    30: ["LEFT CHILD OF 50", "30 < 50, so it lives left. Its whole subtree {20, 40} is also < 50."],
    70: ["RIGHT CHILD OF 50", "70 > 50, so it lives right. Its whole subtree {60, 80} is also > 50."],
    20: ["LEFT CHILD OF 30", "20 < 30 → left. A LEAF: no children, end of the line."],
    40: ["RIGHT CHILD OF 30", "40 > 30 → right. Leaf, like its sibling 20."],
    60: ["LEFT CHILD OF 70", "Surprise: 60 is LEFT of 70 because 60 < 70. Still bigger than 50, though — grandparent rule."],
    80: ["RIGHT CHILD OF 70", "80 > 70 → right. Leaf."]
  };
  const ANATOMY_LIT = [50, [30, [20], [40]], [70, [60], [80]]];

  function initAnatomy() {
    const svg = $("#anatomy-svg");
    const cap = $("#anatomy-caption");
    const root = Viz.fromLiteral(ANATOMY_LIT);
    const sub = new Map([[50, "ROOT"], [20, "LEAF"], [40, "LEAF"], [60, "LEAF"], [80, "LEAF"]]);
    Viz.staticTree(svg, root, {
      sub,
      click: (value, circle) => {
        $$("#anatomy-svg .node-circle").forEach(c => { c.setAttribute("stroke", ""); c.setAttribute("stroke-width", ""); });
        circle.setAttribute("stroke", "#ffb454");
        circle.setAttribute("stroke-width", "3");
        const [title, desc] = ANATOMY[value];
        cap.innerHTML = `<strong style="color:var(--acc)">${value} — ${title}:</strong> ${desc}`;
      }
    });
  }

  /* ============================================================
     02 — VALID vs INVALID
     ============================================================ */
  function initRules() {
    /* valid: classic */
    Viz.staticTree($("#valid-svg"), Viz.fromLiteral([50, [30, [20], [40]], [70, [60], [80]]]), {});

    /* invalid: 55 under 70-left while > 50 — subtree rule broken */
    Viz.staticTree($("#invalid-svg"), Viz.fromLiteral([50, [30, [20], [40]], [70, [55], [80]]]), {
      bad: new Set([55])
    });
  }

  /* ============================================================
     03 — HALVING DEMO (log₂ n intuition)
     ============================================================ */
  function initHalving() {
    const input = $("#ng-input"), bars = $("#ng-bars"), countEl = $("#ng-count"), result = $("#ng-result"), runBtn = $("#ng-run");
    let n = 1000000, cuts = 0, done = false;

    function reset(val) {
      n = Math.max(2, Math.min(1000000000, parseInt(val, 10) || 2));
      cuts = 0;
      done = false;
      runBtn.textContent = "CUT IN HALF";
      countEl.textContent = "0 cuts";
      renderBar();
      result.innerHTML = `n = <b>${n.toLocaleString()}</b> — press CUT IN HALF until the bar vanishes.`;
    }

    function renderBar() {
      bars.innerHTML = "";
      if (n < 1) return;
      const bar = document.createElement("div");
      bar.className = "ng-bar";
      bar.style.width = `${Math.max(4, 100 * Math.log10(n + 1) / 9)}%`;
      bar.textContent = n.toLocaleString();
      bars.appendChild(bar);
    }

    runBtn.addEventListener("click", () => {
      if (done) { reset(input.value); return; }
      n = Math.max(1, Math.floor(n / 2));
      cuts++;
      countEl.textContent = `${cuts} cut${cuts > 1 ? "s" : ""}`;
      renderBar();
      if (n <= 1) {
        done = true;
        runBtn.textContent = "↺ RESTART";
        result.innerHTML = `Done. <b>${cuts}</b> cuts to reach 1. That's ⌈log₂ n⌉ territory — the height of a balanced BST holding n items, and your worst-case search cost.`;
      }
    });
    input.addEventListener("input", () => reset(input.value));
    reset(1000000);
  }

  /* ============================================================
     04 — OPERATION WALKTHROUGHS
     ============================================================ */
  const OPS = {
    search: {
      tree: () => Viz.fromLiteral([50, [30, [20], [40]], [70, [60], [80]]]),
      value: 60,
      blurb: "Searching for <b>60</b>. At each node: equal → done; smaller → left; bigger → right.",
      extra: null,
      fn: (root, v) => BST.search({ root }, v)
    },
    insert: {
      tree: () => Viz.fromLiteral([50, [30, [20], [40]], [70, [60], [80]]]),
      value: 45,
      blurb: "Inserting <b>45</b>. An insert IS a search — the new node lands exactly where the search falls off the tree.",
      extra: "new",
      fn: (root, v) => BST.insert({ root }, v)
    },
    delete: {
      tree: () => Viz.fromLiteral([50, [30, [20], [45, [35], [48]]], [70, [60], [80]]]),
      value: 30,
      blurb: "Deleting <b>30</b> — a TWO-CHILDREN node, the interesting case (watch the successor step).",
      extra: null,
      fn: (root, v) => BST.deleteValue({ root }, v)
    },
    minmax: {
      tree: () => Viz.fromLiteral([50, [30, [20], [40]], [70, [60], [80]]]),
      value: null,
      blurb: "MIN = leftmost node. MAX = rightmost node. Left is always smaller, right is always bigger — so you just walk.",
      extra: null,
      fn: null
    }
  };

  function initOps() {
    const tabs = $$("#op-tabs .op-tab");
    const stepsEl = $("#op-steps");
    const svg = $("#op-svg");
    const label = $("#op-step-label");
    let cur = "search", stepIdx = 0, steps = [], root = null, log = null;

    function load(opKey) {
      cur = opKey;
      const op = OPS[opKey];
      root = op.tree();
      steps = [];
      stepIdx = 0;

      if (opKey === "minmax") {
        /* build custom steps: highlight leftmost chain then rightmost */
        const leftChain = [], rightChain = [];
        let c = root;
        while (c) { leftChain.push(c); c = c.left; }
        c = root;
        while (c) { rightChain.push(c); c = c.right; }
        steps = [
          { highlight: [root], line: "Start at the root (50). Min and max both hang off this tree." },
          { highlight: leftChain, line: `MIN: keep going LEFT. 50 → ${leftChain.slice(1).map(n => n.value).join(" → ")}. Can't go left anymore → <b>20 is the MINIMUM</b>.` },
          { highlight: rightChain, line: `MAX: back to the root, keep going RIGHT. 50 → ${rightChain.slice(1).map(n => n.value).join(" → ")}. Can't go right anymore → <b>80 is the MAXIMUM</b>.` },
          { line: "Cost: one root-to-bottom walk each — O(height). No traversal, no comparisons with every element." }
        ];
      } else {
        log = op.fn(root, op.value);
        steps = log.log.map(entry => ({ highlight: entry.node ? [entry.node] : [], succ: entry.succ || null, line: entry.line }));
        if (op.extra === "new" && log.node) steps[steps.length - 1].highlight.push(log.node);
      }

      steps.unshift({ highlight: [], line: op.blurb });
      stepIdx = 0;

      /* render step list */
      stepsEl.innerHTML = "";
      steps.forEach((s, i) => {
        const d = document.createElement("div");
        d.className = "op-step";
        d.innerHTML = `<b>${String(i).padStart(2, "0")}</b> &nbsp;${s.line}`;
        d.addEventListener("click", () => go(i));
        stepsEl.appendChild(d);
      });

      Viz.HL.clear(svg);
      Viz.staticTree(svg, root, {});
      label.textContent = `STEP 1/${steps.length}`;
      go(0);
    }

    function go(i) {
      stepIdx = Math.max(0, Math.min(steps.length - 1, i));
      label.textContent = `STEP ${stepIdx + 1}/${steps.length}`;
      [...stepsEl.children].forEach((d, j) => d.classList.toggle("active", j === stepIdx));
      Viz.HL.clear(svg);

      /* progressive highlight: everything up to current step */
      const upto = steps.slice(0, stepIdx + 1);
      upto.forEach(s => {
        (s.highlight || []).forEach(n => {
          const c = findCircleByValue(svg, n.value);
          if (c) Viz.HL.visit(c);
        });
      });
      /* current step: mark its nodes distinctly */
      const curStep = steps[stepIdx];
      (curStep.highlight || []).forEach(n => {
        const c = findCircleByValue(svg, n.value);
        if (c) Viz.HL.path(c);
      });
      if (curStep.succ) {
        const c = findCircleByValue(svg, curStep.succ.value);
        if (c) Viz.HL.found(c);
      }
    }

    tabs.forEach(t => t.addEventListener("click", () => {
      tabs.forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      load(t.dataset.op);
    }));
    $("#op-prev").addEventListener("click", () => go(stepIdx - 1));
    $("#op-next").addEventListener("click", () => go(stepIdx + 1));
    $("#op-replay").addEventListener("click", () => load(cur));

    load("search");
  }

  /* ============================================================
     05 — PLAYGROUND
     ============================================================ */
  let tree = null;

  function initPlayground() {
    const svg = $("#pg-svg");
    const logEl = $("#pg-log");
    tree = BST.createTree();
    BST.bulkInsert(tree, [50, 30, 70, 20, 40, 60, 80]); /* live demo tree on arrival */

    function render(msg) {
      const pos = Viz.draw(svg, tree.root, { width: 900 });
      const h = BST.height(tree.root);
      const n = BST.count(tree.root);

      $("#stat-nodes").textContent = n;
      $("#stat-height").textContent = h;
      $("#ro-nodes").textContent = n;
      $("#ro-height").textContent = h;
      $("#ro-worst").textContent = n ? `${h} comparisons` : "0";

      const bal = $("#ro-bal");
      if (!n) { bal.textContent = "—"; bal.className = ""; }
      else if (BST.isPerfect(tree.root)) { bal.textContent = `YES (perfect, 2^${h}-1)`; bal.className = "good"; }
      else if (BST.isBalanced(tree.root)) { bal.textContent = "YES (heights ±1)"; bal.className = "good"; }
      else { bal.textContent = `NO — height ${h} vs ideal ${Math.ceil(Math.log2(n + 1))}`; bal.className = "evilt"; }

      const io = BST.inorder(tree.root);
      $("#ro-trav").textContent = n ? io.join(" ") : "—";
      $("#ro-sorted").textContent = n ? io.join(", ") : "—";

      if (msg) {
        $("#pg-hint").innerHTML = msg;
      } else {
        $("#pg-hint").textContent = n
          ? `${n} node${n > 1 ? "s" : ""}, height ${h}. Hover nothing — this tree is live: insert, search, delete above.`
          : "Tree is empty — insert a first number to create the root. Try 50, then 30, then 70.";
      }
      return pos;
    }

    function logLines(lines) {
      logEl.innerHTML = lines.map(l => `<div class="log-line">${l}</div>`).join("");
      logEl.scrollTop = logEl.scrollHeight;
    }
    const fmt = (l) => {
      if (/FOUND|attaches|becomes the ROOT|CASE|SUCCESSOR|Copy|climbs|unlink|isn't in|already in the tree/i.test(l)) return `<span class="hit">${l}</span>`;
      if (/dead end/i.test(l)) return `<span class="miss">${l}</span>`;
      return l.replace(/(&lt;|&gt;)/, m => `<span class="cmp">${m}</span>`);
    };

    function flashClear() { setTimeout(() => Viz.HL.clear(svg), 2600); }

    function doInsert(v) {
      const res = BST.insert(tree, v);
      render(res.inserted ? `<strong>${v} inserted.</strong> ${res.log[res.log.length - 1].line}` : res.log[res.log.length - 1].line);
      logLines(res.log.map(e => fmt(e.line)));
      if (res.inserted) {
        const st = svg._nodeState.get(res.node.id);
        if (st) {
          Viz.HL.found(st.circle);
          setTimeout(() => { st.circle.setAttribute("stroke", ""); st.circle.setAttribute("stroke-width", ""); st.circle.style.filter = ""; }, 1400);
        }
      }
      flashClear();
    }

    function doSearch(v) {
      const res = BST.search(tree, v);
      /* animate: highlight each visited node in sequence */
      let delay = 0;
      Viz.HL.clear(svg);
      res.log.forEach(entry => {
        if (!entry.node) return;
        const st = svg._nodeState.get(entry.node.id);
        if (!st) return;
        const isLast = entry.action === "found";
        setTimeout(() => {
          if (entry.action === "found") Viz.HL.found(st.circle);
          else Viz.HL.visit(st.circle);
        }, delay);
        delay += isLast ? 0 : 420;
      });
      render(res.found ? `<strong>${v} FOUND</strong> in ${res.log.length} comparison${res.log.length > 1 ? "s" : ""}.` : `<strong>${v} not found.</strong> The search walked until it hit a dead end.`);
      logLines(res.log.map(e => fmt(e.line)));
      setTimeout(() => Viz.HL.clear(svg), delay + 2400);
    }

    function doDelete(v) {
      const before = BST.count(tree.root);
      const res = BST.deleteValue(tree, v);
      render(res.deleted ? `<strong>${v} deleted.</strong> ${res.log[res.log.length - 1].line}` : res.log[res.log.length - 1].line);
      logLines(res.log.map(e => fmt(e.line)));
      flashClear();
      return res.deleted;
    }

    /* form wiring */
    const wire = (formId, inputId, handler, clearAfter = true) => {
      $(formId).addEventListener("submit", (e) => {
        e.preventDefault();
        const input = $(inputId);
        const v = parseInt(input.value, 10);
        if (Number.isNaN(v)) { $("#pg-hint").innerHTML = "<strong style='color:var(--bad)'>Enter a whole number.</strong>"; return; }
        handler(v);
        if (clearAfter) input.value = "";
      });
    };
    wire("#pg-insert-form", "#pg-insert-input", doInsert);
    wire("#pg-search-form", "#pg-search-input", doSearch);
    wire("#pg-delete-form", "#pg-delete-input", doDelete);

    $("#pg-random").addEventListener("click", () => {
      tree = BST.createTree();
      const pool = Array.from({ length: 25 }, (_, i) => i * 4 + 4);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      BST.bulkInsert(tree, pool.slice(0, 7));
      render("<strong>Random 7 values</strong> inserted — bushy-ish by luck of the draw.");
      logLines([`Inserted: ${BST.inorder(tree.root).join(", ")}`, "Random order → usually decent shape. Sorted order → staircase."]);
    });

    $("#pg-sorted").addEventListener("click", () => {
      tree = BST.createTree();
      BST.bulkInsert(tree, [10, 20, 30, 40, 50, 60, 70]);
      render("<strong>Sorted input 10…70.</strong> Every insert went RIGHT — height 7 for 7 nodes. This is a linked list wearing a tree costume. Press REBALANCE to fix it.");
      logLines(["10 inserted as root", "20 > 10 → right …", "30 > 20 → right …", "…and so on: height = 7. Search = O(n).", "This is why self-balancing trees exist (Balance section)."]);
    });

    $("#pg-clear").addEventListener("click", () => {
      tree = BST.createTree();
      render();
      logLines(["Tree cleared."]);
    });

    $("#pg-balance").addEventListener("click", () => {
      if (!tree.root) { render("Nothing to balance — insert some values first."); return; }
      const before = BST.height(tree.root);
      const log = [];
      const sorted = BST.inorder(tree.root);
      BST.rebalance(tree);
      const after = BST.height(tree.root);
      render(`<strong>Rebalanced:</strong> height ${before} → ${after}. Sorted the values, then rebuilt by recursively picking the middle as root. (AVL/Red-Black do this incrementally with rotations — see Balance.)`);
      logLines([
        `In-order walk → sorted array: [${sorted.join(", ")}]`,
        "Rebuild: middle element becomes root; recurse on left half and right half.",
        `Result: height ${before} → ${after}. Every search now ≤ ${after} comparisons.`
      ]);
    });

    render();
  }

  /* ============================================================
     06 — TRAVERSALS
     ============================================================ */
  function initTraversals() {
    const svg = $("#trav-svg");
    const seqEl = $("#trav-order .trav-seq");
    const noteEl = $("#trav-note");
    const root = Viz.fromLiteral([50, [30, [20], [40]], [70, [60], [80]]]);
    const orders = {
      inorder: { seq: BST.inorder(root), note: "Left → Node → Right: 20, 30, 40, 50, 60, 70, 80 — ascending order, guaranteed, for ANY valid BST. Sorted output for free." },
      preorder: { seq: BST.preorder(root), note: "Node → Left → Right: 50 comes FIRST. Reinsert these values in this order and you rebuild the exact same tree — that's tree serialization." },
      postorder: { seq: BST.postorder(root), note: "Left → Right → Node: children before parents. Safe order for deleting/freeing the whole tree (you never free a node whose children you still need)." },
      levelorder: { seq: BST.levelorder(root), note: "Row by row using a queue: 50, then 30 & 70, then 20, 40, 60, 80. This is how you'd print the tree 'as it looks', and it's used in balance checks." }
    };
    let cur = "inorder", i = 0, timer = null;

    function chips() {
      const o = orders[cur];
      seqEl.innerHTML = o.seq.map((v, j) => `<span class="trav-chip${j < i ? " on" : ""}${j === i - 1 ? " now" : ""}" data-j="${j}">${v}</span>`).join("");
      seqEl.querySelectorAll(".trav-chip").forEach(ch => {
        ch.addEventListener("click", () => { stop(); i = parseInt(ch.dataset.j, 10) + 1; paint(); });
      });
    }

    function paint() {
      chips();
      const o = orders[cur];
      Viz.HL.clear(svg);
      o.seq.slice(0, i).forEach((v, j) => {
        const c = findCircleByValue(svg, v);
        if (c) j === i - 1 ? Viz.HL.found(c) : Viz.HL.visit(c);
      });
      noteEl.textContent = o.note;
    }

    function stop() { if (timer) { clearInterval(timer); timer = null; $("#trav-play").textContent = "▶ PLAY"; } }

    function play() {
      stop();
      if (i >= orders[cur].seq.length) i = 0;
      $("#trav-play").textContent = "❚❚ PAUSE";
      timer = setInterval(() => {
        if (i >= orders[cur].seq.length) { stop(); return; }
        i++;
        paint();
      }, 750);
    }

    $$("#trav-tabs .trav-tab").forEach(t => t.addEventListener("click", () => {
      stop();
      $$("#trav-tabs .trav-tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      cur = t.dataset.trav;
      i = 0;
      paint();
    }));
    $("#trav-prev").addEventListener("click", () => { stop(); i = Math.max(0, i - 1); paint(); });
    $("#trav-next").addEventListener("click", () => { stop(); i = Math.min(orders[cur].seq.length, i + 1); paint(); });
    $("#trav-play").addEventListener("click", () => timer ? stop() : play());

    Viz.staticTree(svg, root, {});
    paint();
  }

  function findCircleByValue(svg, value) {
    let found = null;
    svg.querySelectorAll(".node-label").forEach(t => {
      if (parseInt(t.textContent, 10) === value && !found) found = t.previousElementSibling;
    });
    return found;
  }

  /* ============================================================
     07 — CODE VIEWER
     ============================================================ */
  const CODE = {
    delete: `# full delete with all three cases — Python
def delete(node, key):
    if node is None:
        return None                      # key not here; nothing to do

    if key < node.value:
        node.left = delete(node.left, key)
        return node
    if key > node.value:
        node.right = delete(node.right, key)
        return node

    # --- found the node to delete; which case? ---
    # CASE 1: leaf -> just remove it
    if node.left is None and node.right is None:
        return None

    # CASE 2: one child -> child takes its place
    if node.left is None:
        return node.right
    if node.right is None:
        return node.left

    # CASE 3: two children -> swap with in-order successor
    succ = node.right
    while succ.left:                     # smallest in right subtree
        succ = succ.left
    node.value = succ.value              # copy successor's value up
    node.right = delete(node.right, succ.value)  # remove old successor
    return node`,
    all: `# insert = search for the gap, then fill it
def insert(node, value):
    if node is None:
        return Node(value)               # empty spot -> new leaf here
    if value < node.value:
        node.left = insert(node.left, value)
    elif value > node.value:
        node.right = insert(node.right, value)
    # equal -> duplicate: do nothing (this site's convention)
    return node

# search = the higher/lower game
def search(node, target):
    while node and node.value != target:
        node = node.left if target < node.value else node.right
    return node                          # node or None

# in-order traversal = sorted output, free of charge
def inorder(node, out=[]):
    if node:
        inorder(node.left, out)
        out.append(node.value)
        inorder(node.right, out)
    return out

# pre / post / level for comparison
def preorder(node, out=[]):
    if node:
        out.append(node.value)
        preorder(node.left, out)
        preorder(node.right, out)
    return out

def postorder(node, out=[]):
    if node:
        postorder(node.left, out)
        postorder(node.right, out)
        out.append(node.value)
    return out

from collections import deque
def levelorder(root):
    out, q = [], deque([root])
    while q:
        n = q.popleft()
        out.append(n.value)
        if n.left:  q.append(n.left)
        if n.right: q.append(n.right)
    return out`
  };

  function initCode() {
    const view = $("#code-view");
    const set = (k) => { view.textContent = CODE[k]; };
    $$("#code-tabs .code-tab").forEach(t => t.addEventListener("click", () => {
      $$("#code-tabs .code-tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      set(t.dataset.code);
    }));
    set("delete");
  }

  /* ============================================================
     08 — BALANCE diagrams
     ============================================================ */
  function initBalance() {
    const bushy = BST.createTree();
    BST.bulkInsert(bushy, [40, 20, 60, 10, 30, 50, 70]);
    Viz.staticTree($("#bushy-svg"), bushy.root, {});

    const stair = BST.createTree();
    BST.bulkInsert(stair, [10, 20, 30, 40, 50, 60, 70]);
    Viz.staticTree($("#stair-svg"), stair.root, {});
  }

  /* ============================================================
     tooltips on tap (mobile)
     ============================================================ */
  function initTapTips() {
    $$(".term").forEach(t => {
      t.setAttribute("tabindex", "0");
      t.addEventListener("click", (e) => {
        e.stopPropagation();
        const was = t.classList.contains("open");
        $$(".term.open").forEach(x => x.classList.remove("open"));
        if (!was) t.classList.add("open");
      });
    });
    document.addEventListener("click", () => $$(".term.open").forEach(x => x.classList.remove("open")));
  }

  /* ---------- boot ---------- */
  function boot() {
    initAnatomy();
    initRules();
    initHalving();
    initOps();
    initPlayground();
    initTraversals();
    initCode();
    initBalance();
    initTapTips();
    Quiz.start($("#quiz-root"));
  }

  document.addEventListener("DOMContentLoaded", boot);
  return { boot };
})();
