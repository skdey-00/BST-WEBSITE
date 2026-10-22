#!/usr/bin/env python3
"""Geometry QA v3 — staircase = diagonal (x strictly increases with depth)."""
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

    oob = pg.evaluate("""() => {
      const out = [];
      document.querySelectorAll('svg').forEach(svg => {
        if (!svg.id || !svg.viewBox) return;
        const vb = svg.viewBox.baseVal;
        svg.querySelectorAll('.node-label, .node-sub, .edge').forEach(el => {
          const bb = el.getBBox();
          if (bb.x < -2 || bb.y < -2 || bb.x + bb.width > vb.width + 2 || bb.y + bb.height > vb.height + 2)
            out.push(svg.id + ' ' + el.tagName + ' oob');
        });
      });
      return out;
    }""")
    check("all SVG text/edges within viewBox", len(oob) == 0, "; ".join(oob[:6]))

    overlap_report = pg.evaluate("""() => {
      const out = [];
      document.querySelectorAll('svg').forEach(svg => {
        if (!svg.id) return;
        const circles = [...svg.querySelectorAll('.node-circle')];
        for (let i = 0; i < circles.length; i++)
          for (let j = i + 1; j < circles.length; j++) {
            const a = circles[i].getBoundingClientRect(), c = circles[j].getBoundingClientRect();
            if (!(a.right - 8 < c.left || c.right - 8 < a.left || a.bottom - 8 < c.top || c.bottom - 8 < a.top))
              out.push(svg.id + ': ' + i + '+' + j);
          }
      });
      return out;
    }""")
    check("no overlapping nodes in any SVG", len(overlap_report) == 0, "; ".join(overlap_report[:5]))

    # staircase: sorted 10..70 — each successive in-order node y increases AND x increases
    pg.locator("#pg-sorted").click()
    pg.wait_for_timeout(1600)
    diag = pg.evaluate("""() => {
      const pts = [...document.querySelectorAll('#pg-svg circle')].map(c => ({
        x: parseFloat(c.getAttribute('cx')), y: parseFloat(c.getAttribute('cy')), v: c.nextElementSibling.textContent
      })).sort((a,b) => a.y - b.y);
      let mono = true;
      for (let i = 1; i < pts.length; i++) if (pts[i].x <= pts[i-1].x) mono = false;
      return { mono, n: pts.length, ys: pts.map(p=>Math.round(p.y)) };
    }""")
    check("sorted input -> right-leaning staircase (x↑ with depth)", diag["mono"] and diag["n"] == 7,
          f"mono={diag['mono']} n={diag['n']}")

    pg.locator("#pg-balance").click()
    pg.wait_for_timeout(1600)
    bush = pg.evaluate("""() => {
      const pts = [...document.querySelectorAll('#pg-svg circle')].map(c => ({
        x: parseFloat(c.getAttribute('cx')), y: parseFloat(c.getAttribute('cy')), v: c.nextElementSibling.textContent
      }));
      const root = pts.find(p => p.v === '40');
      const l = pts.find(p => p.v === '20'), r = pts.find(p => p.v === '60');
      return { rootX: root.x, ldx: root.x - l.x, rdx: r.x - root.x, rootY: root.y, lY: l.y };
    }""")
    check("rebalanced -> root 40 centered, children symmetric", abs(bush["ldx"] - bush["rdx"]) < 30 and bush["lY"] > bush["rootY"],
          f"ldx={bush['ldx']:.0f} rdx={bush['rdx']:.0f}")

    b.close()

print(f"\n==== {len(fails)} FAIL ====")
import sys; sys.exit(1 if fails else 0)
