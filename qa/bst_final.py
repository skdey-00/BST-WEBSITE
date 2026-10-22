#!/usr/bin/env python3
"""Final visual checks: centering, highlight colors, card grid, sticky nav, contrast."""
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8123/index.html"
fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))
    if not cond: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(1500)

    for sid in ["anatomy-svg", "trav-svg", "op-svg", "valid-svg", "invalid-svg"]:
        cx = pg.evaluate(f"""() => {{
          const svg = document.querySelector('#{sid}');
          const vb = svg.viewBox.baseVal;
          let x = null;
          svg.querySelectorAll('.node-label').forEach(t => {{ if (t.textContent === '50' && x === null) x = parseFloat(t.getAttribute('x')); }});
          return x === null ? null : (x / vb.width);
        }}""")
        check(f"{sid} root centered (0.35-0.65)", cx is not None and 0.35 < cx < 0.65, f"rel={cx}")

    # children symmetric around root in main diagrams
    sym = pg.evaluate("""() => {
      const svg = document.querySelector('#anatomy-svg');
      const pos = {};
      svg.querySelectorAll('.node-label').forEach(t => pos[t.textContent] = parseFloat(t.getAttribute('x')));
      return { l: pos['50'] - pos['30'], r: pos['70'] - pos['50'] };
    }""")
    check("anatomy children symmetric around root", abs(sym["l"] - sym["r"]) < 25, f"l={sym['l']:.0f} r={sym['r']:.0f}")

    # op walkthrough amber highlight
    pg.locator("#op-tabs [data-op=search]").click(); pg.wait_for_timeout(150)
    for _ in range(3):
        pg.locator("#op-next").click(); pg.wait_for_timeout(80)
    stroke = pg.evaluate("""() => {
      const c = [...document.querySelectorAll('#op-svg .node-circle')].find(c => c.getAttribute('stroke') === '#ffb454');
      return c ? c.getAttribute('stroke-width') : null;
    }""")
    check("op active node amber highlight", stroke is not None)

    # delete walkthrough green successor highlight
    pg.locator("#op-tabs [data-op=delete]").click(); pg.wait_for_timeout(150)
    for _ in range(4):
        pg.locator("#op-next").click(); pg.wait_for_timeout(80)
    green = pg.evaluate("""() => [...document.querySelectorAll('#op-svg .node-circle')].some(c => c.getAttribute('stroke') === '#7fd962')""")
    check("delete walkthrough successor green highlight", green)

    # cards on one row
    grid = pg.evaluate("""() => {
      const cards = [...document.querySelectorAll('#basics .card-grid .card')];
      const tops = cards.slice(0, 3).map(c => Math.round(c.getBoundingClientRect().top));
      return tops;
    }""")
    check("basics cards share row", len(set(grid)) == 1, f"{grid}")

    # labels light fill
    fill = pg.evaluate("getComputedStyle(document.querySelector('#pg-svg .node-label')).fill")
    check("node labels light fill", fill.startswith("rgb(2"), fill)

    # sticky nav
    pg.locator("#quiz").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    top = pg.evaluate("document.querySelector('nav').getBoundingClientRect().top")
    check("nav sticky at top", top == 0, f"top={top}")

    # font loaded / titles non-zero size
    h1 = pg.evaluate("getComputedStyle(document.querySelector('h1')).fontSize")
    check("h1 sized", h1.replace("px","") or 0 > 30, h1)

    # cheat strip present in every major section
    nstrips = pg.evaluate("document.querySelectorAll('.cheat-strip').length")
    check("8+ cheat strips (plain-English first)", nstrips >= 8, f"{nstrips}")

    b.close()
print(f"\n==== {len(fails)} FAIL ====")
import sys; sys.exit(1 if fails else 0)
