import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { chromium } from "playwright"
import { expect, test } from "vitest"
import { samples } from "./capture.ts"

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
