/* ============================================================
   BST LAB — tree.js
   Pure BST logic. No DOM, no rendering. Every operation returns
   a step log so the UI can animate exactly what the algorithm did.
   ============================================================ */
"use strict";

const BST = (() => {

  /* ---------- node & tree ---------- */
  let _id = 0;
  function makeNode(value) {
    return { id: ++_id, value, left: null, right: null };
  }

  function createTree() {
    return { root: null };
  }

  /* ---------- queries ---------- */
  function height(node) {
    if (!node) return 0;
    return 1 + Math.max(height(node.left), height(node.right));
  }

  function count(node) {
    if (!node) return 0;
    return 1 + count(node.left) + count(node.right);
  }

  /* Full = every level completely filled. 2^h - 1 nodes for height h. */
  function isPerfect(node) {
    const h = height(node);
    return count(node) === Math.pow(2, h) - 1;
  }

  /* Strictly balanced = |left height - right height| <= 1 at EVERY node */
  function isBalanced(node) {
    if (!node) return true;
    return Math.abs(height(node.left) - height(node.right)) <= 1
      && isBalanced(node.left) && isBalanced(node.right);
  }

  /* ---------- traversals (return arrays of node values) ---------- */
  function inorder(node, out = []) {
    if (node) { inorder(node.left, out); out.push(node.value); inorder(node.right, out); }
    return out;
  }
  function preorder(node, out = []) {
    if (node) { out.push(node.value); preorder(node.left, out); preorder(node.right, out); }
    return out;
  }
  function postorder(node, out = []) {
    if (node) { postorder(node.left, out); postorder(node.right, out); out.push(node.value); }
    return out;
  }
  function levelorder(node) {
    const out = [];
    if (!node) return out;
    const q = [node];
    while (q.length) {
      const cur = q.shift();
      out.push(cur.value);
      if (cur.left) q.push(cur.left);
      if (cur.right) q.push(cur.right);
    }
    return out;
  }

  /* ============================================================
     SEARCH — walk down, go left if target is smaller, right if bigger.
     Returns { found, log } where log = [{node, action, line, hl}].
     ============================================================ */
  function search(tree, target) {
    const log = [];
    let cur = tree.root;
    let guard = 0;
    while (cur) {
      if (++guard > 10000) break; // safety
      if (target === cur.value) {
        log.push({ node: cur, action: "found", line: `${target} = ${cur.value} → FOUND it. Steps taken: comparisons = ${log.length + 1}.` });
        return { found: true, log };
      }
      if (target < cur.value) {
        log.push({ node: cur, action: "left", line: `${target} < ${cur.value} → go LEFT` });
        cur = cur.left;
      } else {
        log.push({ node: cur, action: "right", line: `${target} > ${cur.value} → go RIGHT` });
        cur = cur.right;
      }
    }
    log.push({ node: null, action: "miss", line: `Hit a dead end (null). ${target} is NOT in the tree. Comparisons: ${log.length}.` });
    return { found: false, log };
  }

  /* ============================================================
     INSERT — search for the value; where the search "falls off" the
     tree is exactly where the new node belongs.
     ============================================================ */
  function insert(tree, value) {
    const log = [];
    const node = makeNode(value);

    if (!tree.root) {
      tree.root = node;
      log.push({ node, action: "root", line: `Tree was empty → ${value} becomes the ROOT.` });
      return { inserted: true, node, log };
    }

    let cur = tree.root;
    let guard = 0;
    while (true) {
      if (++guard > 10000) return { inserted: false, node: null, log };
      if (value === cur.value) {
        log.push({ node: cur, action: "dup", line: `${value} is already in the tree → BSTs here keep values distinct, nothing inserted.` });
        return { inserted: false, node: null, log };
      }
      if (value < cur.value) {
        log.push({ node: cur, action: "left", line: `${value} < ${cur.value} → LEFT` });
        if (!cur.left) {
          cur.left = node;
          log.push({ node: cur, action: "attach", attach: "left", new: node, line: `Left spot is empty → ${value} attaches here as ${cur.value}'s left child.` });
          return { inserted: true, node, log };
        }
        cur = cur.left;
      } else {
        log.push({ node: cur, action: "right", line: `${value} > ${cur.value} → RIGHT` });
        if (!cur.right) {
          cur.right = node;
          log.push({ node: cur, action: "attach", attach: "right", new: node, line: `Right spot is empty → ${value} attaches here as ${cur.value}'s right child.` });
          return { inserted: true, node, log };
        }
        cur = cur.right;
      }
    }
  }

  /* ============================================================
     DELETE — three cases: leaf, one child, two children.
     ============================================================ */
  function deleteValue(tree, value) {
    const log = [];
    let parent = null;
    let cur = tree.root;
    let dir = null;

    /* Phase 1: find the node (recording the path) */
    while (cur && cur.value !== value) {
      parent = cur;
      if (value < cur.value) { log.push({ node: cur, action: "left", line: `${value} < ${cur.value} → LEFT` }); dir = "left"; cur = cur.left; }
      else { log.push({ node: cur, action: "right", line: `${value} > ${cur.value} → RIGHT` }); dir = "right"; cur = cur.right; }
    }
    if (!cur) {
      log.push({ node: null, action: "miss", line: `${value} isn't in the tree — nothing to delete.` });
      return { deleted: false, log };
    }
    log.push({ node: cur, action: "found", line: `Found ${value}. Children: ${cur.left ? "left" : "no left"} / ${cur.right ? "right" : "no right"} → deciding case…` });

    /* Phase 2: apply the right case */
    const replaceInParent = (replacement) => {
      if (!parent) tree.root = replacement;
      else parent[dir] = replacement;
    };

    /* CASE 1: leaf — just cut it off */
    if (!cur.left && !cur.right) {
      log.push({ node: cur, action: "case1", line: `CASE 1 (leaf): ${value} has no children → simply unlink it. Nothing else moves.` });
      replaceInParent(null);
      return { deleted: true, log };
    }

    /* CASE 2: one child — child takes its place */
    if (!cur.left || !cur.right) {
      const child = cur.left || cur.right;
      log.push({ node: cur, action: "case2", child, line: `CASE 2 (one child): ${value}'s only child (${child.value}) climbs up to take its place.` });
      replaceInParent(child);
      return { deleted: true, log };
    }

    /* CASE 3: two children — swap with in-order successor */
    let sParent = cur;
    let s = cur.right;
    while (s.left) { sParent = s; s = s.left; }
    log.push({ node: cur, action: "case3a", succ: s, line: `CASE 3 (two children): find the IN-ORDER SUCCESSOR — go right once, then left as far as possible → ${s.value} (smallest value in the right subtree).` });
    log.push({ node: cur, action: "case3b", succ: s, line: `Copy ${s.value} into the deleted node's spot, then delete the successor down below (it has no left child, so that delete is easy).` });
    cur.value = s.value;
    if (sParent === cur) sParent.right = s.right;
    else sParent.left = s.right;
    return { deleted: true, log };
  }

  /* ============================================================
     REBALANCE — rebuild a perfectly balanced tree from sorted values.
     (The trick used by "balance a BST" interview solutions.)
     ============================================================ */
  function rebalance(tree) {
    const sorted = inorder(tree.root);
    tree.root = buildSorted(sorted, 0, sorted.length - 1);
    return tree;
  }
  function buildSorted(arr, lo, hi) {
    if (lo > hi) return null;
    const mid = Math.floor((lo + hi) / 2);
    const node = makeNode(arr[mid]);
    node.left = buildSorted(arr, lo, mid - 1);
    node.right = buildSorted(arr, mid + 1, hi);
    return node;
  }

  function bulkInsert(tree, values) {
    values.forEach(v => insert(tree, v));
  }

  return {
    createTree, makeNode, insert, search, deleteValue, rebalance, bulkInsert,
    height, count, isPerfect, isBalanced,
    inorder, preorder, postorder, levelorder
  };
})();
