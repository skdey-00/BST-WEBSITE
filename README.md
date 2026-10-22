# BST Lab — interactive Binary Search Tree website

A single-page, dependency-free educational site that explains BSTs end to end.
No build step, no CDN, no frameworks — open `index.html` in any browser (double-click works; it also runs from a static server).

## Plain-English summary

The site teaches Binary Search Trees the way a good teacher would: one plain
sentence per concept FIRST (the amber "cheat strip" at the top of every
section), then diagrams, then interactive widgets, then the details. You can
insert/search/delete values in a real live tree and watch every comparison
it makes, step by step.

## Sections

| # | Section | What's interactive |
|---|---------|--------------------|
| 01 | Basics | Click any node in the anatomy tree → plain-English explanation |
| 02 | The rule | Side-by-side valid vs invalid BST (the broken node is flagged red-dashed) |
| 03 | Why fast (Big-O) | Halving demo: type any n, cut it in half, count the cuts = log₂ n |
| 04 | Operations | Step-through walkthroughs of search / insert / delete / min-max with live highlighting |
| 05 | Playground | Full live BST: insert, search, delete, random 7, sorted trap (10..70), rebalance; step log shows every comparison; vitals panel shows nodes/height/balance/sorted order |
| 06 | Traversals | Play/pause/step through in/pre/post/level-order with visit-order chips |
| 07 | Code | Annotated Python: the 3-case delete, insert, search, all four traversals |
| 08 | Balance | Bushy vs staircase same-7-values comparison; AVL / Red-Black in plain English |
| 09 | Compare | BST vs hash table vs sorted array vs linked list (honest, with worst-case row) |
| 10 | Quiz | 8 questions, instant feedback, plain-English "why" for every answer |

## Files

```
bst-website/
  index.html      content + section structure
  css/style.css   dark engineering theme (amber/cyan, HUD frame, blueprint grid)
  js/tree.js      pure BST logic (no DOM) — every op returns a step log
  js/viz.js       SVG renderer: in-order-index layout, keyed node tweens
  js/app.js       wires all sections + playground
  js/quiz.js      quiz engine
```

## Design notes

- Layout = in-order index (uniform spacing). Chosen over band-midpoint
  because degenerate chains (the exact thing the site teaches about) make
  geometric layouts converge and overlap; in-order layout can never overlap.
- All claims are the standard, verifiable ones: O(h) ops, log₂(10⁶) ≈ 20,
  in-order = sorted, successor-based two-child delete. No invented stats.
- Height convention: height = number of levels (chain of 7 nodes → height 7,
  worst-case search 7 comparisons). Used consistently in copy, code and UI.

## QA (headless Chromium, Playwright)

- 49/49 functional checks PASS: all diagrams render, playground insert/search
  (hit + miss)/delete (leaf, one-child, two-children, missing)/random/sorted/
  rebalance/duplicate-reject, traversals (all 4 orders verified against the
  reference tree), quiz perfect run + wrong-answer path, code tabs, tooltips.
- 17/17 geometry checks PASS: no node overlap in any SVG, all text within
  viewBox, roots centered, highlights applied, mobile 390px zero overflow.
- 0 console errors across the entire run.
