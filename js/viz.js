/* ============================================================
   BST LAB — viz.js
   SVG tree renderer. Nodes are keyed by node.id so edits tween
   smoothly instead of redrawing from scratch.
   ============================================================ */
"use strict";

const Viz = (() => {
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- low-level svg helpers ---------- */
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* accept both {x,y} and {cx,cy} points */
  function tween(elem, from, to, ms, done) {
    const F = { cx: from.cx ?? from.x, cy: from.cy ?? from.y };
    const T = { cx: to.cx ?? to.x, cy: to.cy ?? to.y };
    const t0 = performance.now();
    (function frame(now) {
      const t = Math.min(1, (now - t0) / ms);
      const k = easeOut(t);
      elem.setAttribute("cx", lerp(F.cx, T.cx, k));
      elem.setAttribute("cy", lerp(F.cy, T.cy, k));
      if (t < 1) requestAnimationFrame(frame);
      else if (done) done();
    })(performance.now());
  }

  /* ---------- layout ---------- */
  /* x = in-order index spread evenly (never overlaps, even for degenerate
     chains), y = depth. For balanced trees this equals the classic picture. */
  function layout(root, opts) {
    const o = Object.assign({ x0: 46, width: 640, y0: 42, dy: 62 }, opts);
    const pos = new Map(); // node.id -> {x, y, depth}
    let i = 0;
    (function walk(n, depth) {
      if (!n) return;
      walk(n.left, depth + 1);
      pos.set(n.id, { x: i++, y: o.y0 + depth * o.dy, depth });
      walk(n.right, depth + 1);
    })(root, 0);
    const count = i;
    pos.forEach(p => {
      p.x = count === 1 ? o.width / 2 : o.x0 + (p.x / (count - 1)) * (o.width - 2 * o.x0);
    });
    return pos;
  }

  /* ---------- main draw ---------- */
  /* state: Map(node.id -> {circle, label, edges:[line,line], from}) kept on svg */
  function draw(svg, root, opts = {}) {
    const width = opts.width || parseFloat(svg.viewBox.baseVal.width) || 640;
    const h = BST.height(root);
    const pos = layout(root, { width, y0: 40, dy: Math.max(46, Math.min(66, (parseFloat(svg.viewBox.baseVal.height) - 60) / Math.max(1, h - 1 || 1))) });

    /* edges group under nodes */
    let edgeG = svg.querySelector(".edge-g");
    let nodeG = svg.querySelector(".node-g");
    if (!edgeG) {
      svg.innerHTML = "";
      edgeG = el("g", { class: "edge-g" }, svg);
      nodeG = el("g", { class: "node-g" }, svg);
    }

    const state = svg._nodeState || (svg._nodeState = new Map());

    /* --- pass 1: upsert nodes --- */
    const seen = new Set();
    (function walk(n, parent) {
      if (!n) return;
      seen.add(n.id);
      const p = pos.get(n.id);
      let st = state.get(n.id);
      if (!st) {
        /* new node: spawn from parent's position (or drop from above for root) */
        const from = parent ? pos.get(parent.id) : { x: p.x, y: p.y - 70 };
        const c = el("circle", { class: "node-circle", cx: from.x, cy: from.y, r: 0 }, nodeG);
        const t = el("text", { class: "node-label", x: from.x, y: from.y }, nodeG);
        t.textContent = n.value;
        st = { circle: c, label: t, edges: [] };
        state.set(n.id, st);
        tween(c, { cx: from.x, cy: from.y }, p, 400);
        growR(c, 0, 20, 350);
      } else {
        /* existing node: tween to new position */
        tween(st.circle, { cx: parseFloat(st.circle.getAttribute("cx")), cy: parseFloat(st.circle.getAttribute("cy")) }, p, 380);
      }
      st.label.textContent = n.value;
      st.pos = p;
      walk(n.left, n);
      walk(n.right, n);
    })(root, null);

    /* make each label ride along with its circle (hook setAttribute once) */
    state.forEach((st) => {
      if (st.labelFollowed) return;
      st.labelFollowed = true;
      const orig = st.circle.setAttribute.bind(st.circle);
      st.circle.setAttribute = (k, v) => {
        orig(k, v);
        if (k === "cx") st.label.setAttribute("x", v);
        if (k === "cy") st.label.setAttribute("y", v);
      };
    });

    /* --- pass 2: edges (drawn fresh each time — they're cheap) --- */
    edgeG.innerHTML = "";
    (function walk2(n) {
      if (!n) return;
      const p = pos.get(n.id);
      [[n.left, "left"], [n.right, "right"]].forEach(([c]) => {
        if (!c) return;
        const cp = pos.get(c.id);
        el("line", { class: "edge", x1: p.x, y1: p.y, x2: cp.x, y2: cp.y }, edgeG);
      });
      walk2(n.left); walk2(n.right);
    })(root);

    /* --- pass 3: drop state for removed nodes --- */
    state.forEach((st, id) => {
      if (!seen.has(id)) {
        /* fade out */
        st.circle.style.opacity = 0;
        st.label.style.opacity = 0;
        setTimeout(() => { st.circle.remove(); st.label.remove(); }, 400);
        state.delete(id);
      }
    });

    return pos;
  }

  function growR(circle, from, to, ms) {
    const t0 = performance.now();
    (function f(now) {
      const t = Math.min(1, (now - t0) / ms);
      circle.setAttribute("r", lerp(from, to, easeOut(t)));
      if (t < 1) requestAnimationFrame(f);
    })(performance.now());
  }

  /* ---------- highlight helpers (all take the circle ELEMENT) ---------- */
  const HL = {
    visit(c) { c.setAttribute("stroke", "#59c2ff"); c.setAttribute("stroke-width", "3"); },
    path(c) { c.setAttribute("stroke", "#ffb454"); c.setAttribute("stroke-width", "3"); },
    found(c) { c.setAttribute("stroke", "#7fd962"); c.setAttribute("stroke-width", "3.5"); c.style.filter = "drop-shadow(0 0 6px rgba(127,217,98,.7))"; },
    clear(svg) {
      svg.querySelectorAll(".node-circle").forEach(c => {
        c.setAttribute("stroke", ""); c.setAttribute("stroke-width", ""); c.style.filter = "";
      });
    }
  };

  /* ---------- static tree painter (for diagrams) ---------- */
  function staticTree(svg, root, opts = {}) {
    const width = opts.width || parseFloat(svg.viewBox.baseVal.width);
    const h = BST.height(root);
    const vbH = parseFloat(svg.viewBox.baseVal.height);
    const subPad = (opts.sub && opts.sub.size) ? 24 : 0; /* room for ROOT/LEAF captions */
    /* last node center = y0 + (h-1)*dy, and it needs r(20) + caption space below */
    const y0 = 30;
    const usable = vbH - y0 - 20 - subPad;
    const dy = h > 1 ? Math.min(64, usable / (h - 1)) : 0;
    const pos = layout(root, { width, y0, dy: Math.max(26, dy) });
    svg.innerHTML = "";
    const edgeG = el("g", {}, svg);
    const nodeG = el("g", {}, svg);
    const vpos = new Map(); /* value -> {x, y} for overlays */

    (function edges(n) {
      if (!n) return;
      const p = pos.get(n.id);
      [n.left, n.right].forEach(c => {
        if (!c) return;
        const cp = pos.get(c.id);
        el("line", { class: "edge", x1: p.x, y1: p.y, x2: cp.x, y2: cp.y }, edgeG);
        edges(c);
      });
    })(root);

    (function nodes(n, side) {
      if (!n) return;
      const p = pos.get(n.id);
      vpos.set(n.value, p);
      const c = el("circle", { class: "node-circle", cx: p.x, cy: p.y, r: opts.r || 19 }, nodeG);
      if (side === "L") c.setAttribute("stroke", "#59c2ff");
      if (side === "R") c.setAttribute("stroke", "#ffb454");
      if (opts.bad && opts.bad.has(n.value)) {
        c.setAttribute("stroke", "#f07171");
        c.setAttribute("stroke-dasharray", "4 3");
      }
      if (opts.click) {
        c.style.cursor = "pointer";
        c.addEventListener("click", () => opts.click(n.value, c));
      }
      const t = el("text", { class: "node-label", x: p.x, y: p.y }, nodeG);
      t.textContent = n.value;
      if (opts.bad && opts.bad.has(n.value)) t.setAttribute("fill", "#f07171");
      if (opts.sub && opts.sub.has(n.value)) {
        const s = el("text", { class: "node-sub", x: p.x, y: p.y + (opts.r || 19) + 13 }, nodeG);
        s.textContent = opts.sub.get(n.value);
        if (side === "L") s.setAttribute("class", "node-sub side-l");
        if (side === "R") s.setAttribute("class", "node-sub side-r");
      }
      nodes(n.left, "L");
      nodes(n.right, "R");
    })(root, null);

    return { pos, vpos, nodeG };
  }

  /* build a tree from nested-array literal: [50,[30,[20],[40]],[70,[60],[80]]] */
  function fromLiteral(lit) {
    if (!lit) return null;
    const n = BST.makeNode(lit[0]);
    n.left = fromLiteral(lit[1]);
    n.right = fromLiteral(lit[2]);
    return n;
  }

  return { draw, staticTree, fromLiteral, HL, el };
})();
