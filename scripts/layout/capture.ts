import { writeFile } from "node:fs/promises"
import path from "node:path"
import { type Page } from "playwright"
import { type Snapshot } from "./types.ts"

export async function settle(page: Page) {
  let networkIdle = true
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 })
  } catch {
    networkIdle = false
  }
  await page.waitForTimeout(3000)
  return networkIdle
}

export async function screenshot(page: Page, file: string) {
  const cdp = await page.context().newCDPSession(page)
  try {
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    })
    await writeFile(file, Buffer.from(data, "base64"))
  } finally {
    await cdp.detach()
  }
}

async function timedSnapshots(page: Page) {
  const start = Date.now()
  return await Promise.all(
    [0, 250, 1000, 3000].map(async (delay) => {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, start + delay - Date.now()))
      )
      let snapshot: Snapshot
      try {
        snapshot = await page.evaluate(() => window.__layout.snapshot())
      } catch {
        // A redirect can replace the document between two samples.
        await page.waitForFunction(() => Boolean(window.__layout), undefined, {
          timeout: 15000,
        })
        snapshot = await page.evaluate(() => window.__layout.snapshot())
      }
      return { elapsed: Date.now() - start, snapshot }
    })
  )
}

export async function samples(page: Page, output: string) {
  const start = Date.now()
  const settling = settle(page)
  // Timers sample geometry independently of PNG encoding and I/O.
  const snapshots = timedSnapshots(page)
  const images: { screenshot: string; screenshotElapsed: number }[] = []
  for (const ms of [0, 250, 1000, 3000]) {
    await page.waitForTimeout(Math.max(0, start + ms - Date.now()))
    const file = path.join(output, `${ms}.png`)
    await screenshot(page, file)
    images.push({ screenshot: file, screenshotElapsed: Date.now() - start })
  }
  const captured = (await snapshots).map((sample, index) => ({
    ...sample,
    ...images[index],
  }))
  const networkIdle = await settling
  const snapshot = await page.evaluate(() => window.__layout.snapshot())
  const file = path.join(output, "settled.png")
  await screenshot(page, file)
  captured.push({
    elapsed: Date.now() - start,
    snapshot,
    screenshot: file,
    screenshotElapsed: Date.now() - start,
  })
  return { samples: captured, networkIdle }
}
