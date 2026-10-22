#!/usr/bin/env python3
"""Headless QA for BST Lab — console errors + full interactive flow test. (v2)"""
import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8123/index.html"
results, errors = [], []

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))

    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(900)

    # ---- static diagrams render ----
    for sid in ["anatomy-svg", "valid-svg", "invalid-svg", "op-svg", "pg-svg", "trav-svg", "bushy-svg", "stair-svg"]:
        n = pg.locator(f"#{sid} circle").count()
        check(f"diagram {sid} nodes>0", n > 0, f"circles={n}")
    check("anatomy has 7 nodes", pg.locator("#anatomy-svg circle").count() == 7)
    check("pg preloaded with 7-node demo tree", pg.locator("#pg-svg circle").count() == 7,
          f"circles={pg.locator('#pg-svg circle').count()}")

    # playground nodes settle at real positions (tween fix): root near horizontal center
    root_cx = pg.evaluate("""() => {
      const svg = document.querySelector('#pg-svg');
      const vb = svg.viewBox.baseVal;
      let c = null;
      svg.querySelectorAll('.node-label').forEach(t => { if (t.textContent === '50' && !c) c = t; });
      return c ? parseFloat(c.getAttribute('x')) : null;
    }""")
    check("pg nodes tweened to real positions (no NaN)", root_cx is not None and 380 < root_cx < 520, f"root x={root_cx}")

    # ---- anatomy click ----
    pg.locator("#anatomy-svg circle").nth(5).click()
    cap = pg.locator("#anatomy-caption").inner_text()
    check("anatomy click updates caption", "60" in cap and "LEFT CHILD OF 70" in cap, cap[:80])

    # ---- halving demo: 1,000,000 -> expect 20 cuts ----
    pg.locator("#ng-run").click()
    cuts = 0
    for _ in range(200):
        cuts = int(pg.locator("#ng-count").inner_text().split()[0])
        if "RESTART" in pg.locator("#ng-run").inner_text():
            break
        pg.locator("#ng-run").click()
        pg.wait_for_timeout(20)
    check("halving 1e6 -> ~20 cuts", 19 <= cuts <= 21, f"cuts={cuts}")

    # ---- operation tabs ----
    for op in ["search", "insert", "delete", "minmax"]:
        pg.locator(f"#op-tabs [data-op={op}]").click()
        pg.wait_for_timeout(150)
        n_steps = pg.locator("#op-steps .op-step").count()
        check(f"op {op} steps>0", n_steps >= 3, f"steps={n_steps}")
    pg.locator("#op-tabs [data-op=search]").click(); pg.wait_for_timeout(120)
    last_lbl = ""
    for _ in range(10):
        pg.locator("#op-next").click(); pg.wait_for_timeout(50)
        last_lbl = pg.locator("#op-step-label").inner_text()
        if "/" in last_lbl and last_lbl.split("/")[0].strip().split()[1] == last_lbl.split("/")[1]:
            break
    n_steps = int(last_lbl.split()[1].split("/")[0])
    total = int(last_lbl.split("/")[1])
    check("search walkthrough reaches last step", n_steps == total, last_lbl)

    # ---- playground: clear then insert sequence ----
    pg.locator("#pg-clear").click(); pg.wait_for_timeout(300)
    def insert(v):
        pg.locator("#pg-insert-input").fill(str(v))
        pg.locator("#pg-insert-form button").click()
        pg.wait_for_timeout(500)
    for v in [50, 30, 70, 20, 40, 60, 80]:
        insert(v)
    check("pg 7 nodes", pg.locator("#ro-nodes").inner_text() == "7", pg.locator("#ro-nodes").inner_text())
    check("pg height 3", pg.locator("#ro-height").inner_text() == "3", pg.locator("#ro-height").inner_text())
    check("pg balanced YES", "YES" in pg.locator("#ro-bal").inner_text(), pg.locator("#ro-bal").inner_text())
    check("pg in-order sorted", pg.locator("#ro-trav").inner_text() == "20 30 40 50 60 70 80", pg.locator("#ro-trav").inner_text())

    # ---- playground: search hit + miss ----
    pg.locator("#pg-search-input").fill("60")
    pg.locator("#pg-search-form button").click()
    pg.wait_for_timeout(2000)
    check("pg search 60 found", "FOUND" in pg.locator("#pg-hint").inner_text(), pg.locator("#pg-hint").inner_text()[:70])
    nlog = pg.locator("#pg-log .log-line").count()
    check("pg search 60 = 3 comparisons", nlog == 3, f"log lines={nlog}")

    pg.locator("#pg-search-input").fill("65")
    pg.locator("#pg-search-form button").click()
    pg.wait_for_timeout(2400)
    check("pg search 65 miss", "not found" in pg.locator("#pg-hint").inner_text(), pg.locator("#pg-hint").inner_text()[:70])

    # ---- playground: delete leaf, one-child, two-children ----
    def delete(v):
        pg.locator("#pg-delete-input").fill(str(v))
        pg.locator("#pg-delete-form button").click()
        pg.wait_for_timeout(500)
    delete(80)
    check("delete leaf 80", pg.locator("#ro-nodes").inner_text() == "6")
    delete(70)
    check("delete one-child 70", pg.locator("#ro-nodes").inner_text() == "5")
    delete(30)
    check("delete two-children 30", pg.locator("#ro-nodes").inner_text() == "4")
    check("tree still valid BST after deletes",
          pg.locator("#ro-sorted").inner_text() == "20, 40, 50, 60", pg.locator("#ro-sorted").inner_text())

    # delete a value not in tree
    delete(99)
    check("delete missing value is a no-op", pg.locator("#ro-nodes").inner_text() == "4")

    # ---- sorted trap + rebalance ----
    pg.locator("#pg-sorted").click(); pg.wait_for_timeout(450)
    check("sorted -> height 7", pg.locator("#ro-height").inner_text() == "7", pg.locator("#ro-height").inner_text())
    check("sorted -> NOT balanced", "NO" in pg.locator("#ro-bal").inner_text())
    pg.locator("#pg-balance").click(); pg.wait_for_timeout(700)
    check("rebalance -> height 3", pg.locator("#ro-height").inner_text() == "3", pg.locator("#ro-height").inner_text())
    check("rebalance keeps values", pg.locator("#ro-sorted").inner_text() == "10, 20, 30, 40, 50, 60, 70",
          pg.locator("#ro-sorted").inner_text())

    # ---- random 7 ----
    pg.locator("#pg-random").click(); pg.wait_for_timeout(450)
    check("random 7 nodes", pg.locator("#ro-nodes").inner_text() == "7")

    # ---- duplicate insert rejected ----
    val = pg.locator("#ro-sorted").inner_text().split(",")[0].strip()
    insert(val)
    check("duplicate insert rejected", pg.locator("#ro-nodes").inner_text() == "7",
          pg.locator("#ro-nodes").inner_text())

    # ---- traversals (demo tree fixed: 50/30/70/20/40/60/80) ----
    pg.locator("#trav-tabs [data-trav=inorder]").click(); pg.wait_for_timeout(150)
    pg.locator("#trav-play").click()
    pg.wait_for_timeout(6600)
    chips_on = pg.locator("#trav-order .trav-chip.on").count()
    check("inorder play lights all 7", chips_on == 7, f"on={chips_on}")
    seq = " ".join(pg.locator("#trav-order .trav-chip").all_inner_texts())
    check("inorder chips sorted 20..80", seq == "20 30 40 50 60 70 80", seq)
    # preorder first chip = 50 (root)
    pg.locator("#trav-play").click()  # stop
    pg.locator("#trav-tabs [data-trav=preorder]").click(); pg.wait_for_timeout(150)
    pre_seq = " ".join(pg.locator("#trav-order .trav-chip").all_inner_texts())
    check("preorder starts at root 50", pre_seq.startswith("50"), pre_seq)
    pg.locator("#trav-tabs [data-trav=levelorder]").click(); pg.wait_for_timeout(150)
    lvl_seq = " ".join(pg.locator("#trav-order .trav-chip").all_inner_texts())
    check("levelorder = rows 50 30 70 20 40 60 80", lvl_seq == "50 30 70 20 40 60 80", lvl_seq)
    pg.locator("#trav-tabs [data-trav=postorder]").click(); pg.wait_for_timeout(150)
    post_seq = " ".join(pg.locator("#trav-order .trav-chip").all_inner_texts())
    check("postorder ends at root 50", post_seq.endswith("50"), post_seq)

    # ---- quiz: perfect run ----
    answers = [0, 1, 1, 2, 2, 1, 1, 1]
    for a in answers:
        pg.locator(".quiz-opt").nth(a).click()
        pg.wait_for_timeout(120)
        pg.locator("#quiz-next").click()
        pg.wait_for_timeout(200)
    final = pg.locator(".quiz-final .big-score").inner_text()
    check("quiz perfect run 8/8", final.strip() == "8 / 8", final)
    # wrong-answer path: retry, answer Q1 wrong
    pg.locator("#quiz-retry").click(); pg.wait_for_timeout(250)
    pg.locator(".quiz-opt").nth(2).click(); pg.wait_for_timeout(150)
    check("wrong answer shows explanation", pg.locator(".quiz-explain").count() == 1)
    check("wrong answer marked", pg.locator(".quiz-opt.wrong").count() == 1)

    # ---- code tabs ----
    pg.locator("#code-tabs [data-code=all]").click()
    check("code tab 'all' shows insert", "def insert" in pg.locator("#code-view").inner_text())
    pg.locator("#code-tabs [data-code=delete]").click()
    check("code tab delete shows successor", "succ" in pg.locator("#code-view").inner_text())

    # ---- tooltip ----
    pg.locator(".term").first.click()
    check("tooltip opens on tap", pg.evaluate("document.querySelector('.term.open') !== null"))

    # ---- console errors ----
    check("ZERO console errors", len(errors) == 0, "; ".join(errors[:3]))

    # ---- mobile layout ----
    pg2 = b.new_page(viewport={"width": 390, "height": 844})
    pg2.goto(URL, wait_until="networkidle")
    pg2.wait_for_timeout(700)
    overflow = pg2.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("mobile 390px no horizontal overflow", overflow <= 2, f"overflow={overflow}px")

    b.close()

fails = [r for r in results if not r[1]]
print(f"\n==== {len(results) - len(fails)}/{len(results)} PASS, {len(fails)} FAIL ====")
sys.exit(1 if fails else 0)
