import path from "node:path"
import { chromium } from "playwright"
import { expect, test } from "vitest"
import { compare } from "./diff.ts"
import "./types.ts"

test("captures recent-input shifts, replacements, resizing and scroll changes", async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.addInitScript({
      path: path.join(import.meta.dirname, "probe.js"),
    })
    await page.goto(
      `data:text/html,${encodeURIComponent(`
      <button id="change">Change</button>
      <div id="size" style="height:20px;width:100px">Size</div>
      <div id="moving">Moving neighbor</div>
      <div id="replace"><span>Placeholder</span></div>
      <div id="scroll" style="height:80px;overflow:auto"><div style="height:800px">Scrollable</div></div>
      <div style="opacity:0"><div id="invisible">Invisible loader</div></div>
      <div style="height:20px;overflow:hidden"><div id="clipped" style="transform:translateY(80px)">Clipped</div></div>
      <script>document.querySelector('#change').onclick = () => {
        document.querySelector('#size').style.height = '70px';
        document.querySelector('#replace').innerHTML = '<span>Replacement</span>';
        document.querySelector('#scroll').scrollTop = 90;
      };</script>
    `)}`
    )
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    )
    const before = await page.evaluate(() => window.__layout.snapshot())
    expect(
      before.nodes.some((node) => node.selector.includes("#invisible"))
    ).toBe(false)
    expect(
      before.nodes.some((node) => node.selector.includes("#clipped"))
    ).toBe(false)
    await page.evaluate(() => window.__mark("click change"))
    await page.locator("#change").click()
    await page.waitForFunction(() => window.__layout.shifts.length > 0)
    const after = await page.evaluate(() => window.__layout.snapshot())
    const shifts = await page.evaluate(() => window.__layout.shifts)
    expect(
      shifts.some(
        (entry) => entry.hadRecentInput && entry.action === "click change"
      )
    ).toBe(true)
    const differences = compare(before, after)
    expect(
      differences.rects.some(
        (entry) =>
          entry.selector.includes("#replace") && entry.kind === "replaced"
      )
    ).toBe(true)
    expect(
      differences.rects.some(
        (entry) => entry.selector === "div#size" && entry.kind === "rect"
      )
    ).toBe(true)
    expect(differences.scroll).toContainEqual(
      expect.objectContaining({
        selector: "div#scroll",
        to: expect.objectContaining({ top: 90 }),
      })
    )
  } finally {
    await browser.close()
  }
})
