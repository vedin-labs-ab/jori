import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { chromium } from "playwright"
import { expect, test, vi } from "vitest"
import { samples, screenshot } from "./capture.ts"

test("a screenshot that never replies reaches a deadline and detaches CDP", async () => {
  const browser = await chromium.launch()
  const directory = await mkdtemp(path.join(tmpdir(), "jori-layout-stall-"))
  try {
    const page = await browser.newPage()
    const cdp = await page.context().newCDPSession(page)
    vi.spyOn(cdp, "send").mockImplementation(() => new Promise(() => {}))
    const detach = vi.spyOn(cdp, "detach")
    vi.spyOn(page.context(), "newCDPSession").mockResolvedValue(cdp)
    await expect(
      screenshot(page, path.join(directory, "stall.png"), 50)
    ).rejects.toThrow("Screenshot deadline exceeded")
    expect(detach).toHaveBeenCalled()
  } finally {
    vi.restoreAllMocks()
    await browser.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test("a closed screenshot target rejects the item without an unhandled timer", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "jori-layout-"))
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.addInitScript({
      path: path.join(import.meta.dirname, "probe.js"),
    })
    await page.goto("data:text/html,<div>Capture failure</div>")
    const capture = samples(page, directory)
    const rejected = expect(capture).rejects.toThrow()
    await page.close()
    await rejected
  } finally {
    await browser.close()
    await rm(directory, { recursive: true, force: true })
  }
})
