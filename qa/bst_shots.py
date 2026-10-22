#!/usr/bin/env python3
"""Visual QA screenshots for BST Lab."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto("http://127.0.0.1:8123/index.html", wait_until="networkidle")
    pg.wait_for_timeout(1000)

    # 1. hero + basics
    pg.screenshot(path="/tmp/bst_shots/01-top.png")
    # 2. rules valid/invalid
    pg.locator("#rules").scroll_into_view_if_needed(); pg.wait_for_timeout(400)
    pg.screenshot(path="/tmp/bst_shots/02-rules.png")
    # 3. ops panel with delete tab active, mid-step
    pg.locator("#operations").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    pg.locator("#op-tabs [data-op=delete]").click(); pg.wait_for_timeout(200)
    for _ in range(4):
        pg.locator("#op-next").click(); pg.wait_for_timeout(120)
    pg.screenshot(path="/tmp/bst_shots/03-ops-delete.png")
    # 4. playground after a delete + log
    pg.locator("#playground").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    pg.locator("#pg-delete-input").fill("50")
    pg.locator("#pg-delete-form button").click()
    pg.wait_for_timeout(700)
    pg.screenshot(path="/tmp/bst_shots/04-playground.png")
    # 5. traversals mid-play
    pg.locator("#traversals").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    pg.locator("#trav-tabs [data-trav=inorder]").click(); pg.wait_for_timeout(100)
    pg.locator("#trav-play").click()
    pg.wait_for_timeout(2600)
    pg.screenshot(path="/tmp/bst_shots/05-traversals.png")
    pg.locator("#trav-play").click()
    # 6. quiz answered state
    pg.locator("#quiz").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    pg.locator(".quiz-opt").nth(0).click(); pg.wait_for_timeout(300)
    pg.screenshot(path="/tmp/bst_shots/06-quiz.png")
    # 7. full page (desktop)
    pg.screenshot(path="/tmp/bst_shots/07-full.png", full_page=True)
    # 8. mobile full
    pg2 = b.new_page(viewport={"width": 390, "height": 844})
    pg2.goto("http://127.0.0.1:8123/index.html", wait_until="networkidle")
    pg2.wait_for_timeout(800)
    pg2.screenshot(path="/tmp/bst_shots/08-mobile-full.png", full_page=True)
    pg2.locator("#playground").scroll_into_view_if_needed(); pg2.wait_for_timeout(500)
    pg2.screenshot(path="/tmp/bst_shots/09-mobile-playground.png")
    b.close()
print("shots done")
