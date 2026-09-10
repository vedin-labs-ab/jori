import { writeFile } from "node:fs/promises"
import path from "node:path"
import { type CDPSession, type Page } from "playwright"
import { waitReady } from "./actions.ts"
import { settle } from "./measurement/network.ts"
import { type Readiness, type Snapshot } from "./types.ts"

export { settle } from "./measurement/network.ts"

/** Guard and walk in one evaluation, including documents replaced mid-capture. */
export async function snapshot(page: Page): Promise<Snapshot> {
  const start = Date.now()
  while (Date.now() - start < 90_000) {
    try {
      const captured = await page.evaluate(() => {
        if (!window.__layout || !performance.getEntriesByType("paint").length) {
          return null
        }
        return window.__layout.snapshot()
      })
      if (captured) {
        return captured
      }
    } catch (error) {
      if (
        page.isClosed() ||
        !/Execution context was destroyed|Cannot find context/.test(
          String(error)
        )
      ) {
        throw error
      }
    }
    await page.waitForTimeout(16)
  }
  throw new Error("No painted document with an initialized layout probe")
}

export async function screenshot(page: Page, file: string, timeoutMs = 20_000) {
  const cdp = await page.context().newCDPSession(page)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Screenshot deadline exceeded: ${file}`))
        void cdp.detach().catch(() => {})
      }, timeoutMs)
    })
    const { data } = await Promise.race([capturePng(cdp), deadline])
    await writeFile(file, Buffer.from(data, "base64"))
  } finally {
    clearTimeout(timer)
    await cdp.detach().catch(() => {})
  }
}

async function timedSnapshots(page: Page) {
  const start = Date.now()
  return await Promise.all(
    [0, 250, 1000, 3000].map(async (delay) => {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, start + delay - Date.now()))
      )
      const captured = await snapshot(page)
      return { elapsed: Date.now() - start, snapshot: captured }
    })
  )
}

async function capturePng(cdp: CDPSession) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await cdp.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
        fromSurface: true,
      })
    } catch (error) {
      if (attempt === 2) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)))
    }
  }
}

async function timedScreenshots(page: Page, output: string) {
  const start = Date.now()
  const images: { screenshot: string; screenshotElapsed: number }[] = []
  for (const ms of [0, 250, 1000, 3000]) {
    await page.waitForTimeout(Math.max(0, start + ms - Date.now()))
    const file = path.join(output, `${ms}.png`)
    await screenshot(page, file)
    images.push({ screenshot: file, screenshotElapsed: Date.now() - start })
  }
  return images
}

function fulfilled<T>(result: PromiseSettledResult<T>) {
  if (result.status === "rejected") {
    throw result.reason
  }
  return result.value
}

export async function samples(page: Page, output: string, ready?: Readiness[]) {
  const start = Date.now()
  // Handle every branch immediately. Closing a failed capture must never
  // leave a timer or the network-idle wait rejecting in the background.
  const [geometry, pictures, settled, completed] = await Promise.allSettled([
    timedSnapshots(page),
    timedScreenshots(page, output),
    settle(page),
    waitReady(page, ready),
  ])
  const images = fulfilled(pictures)
  const captured = fulfilled(geometry).map((sample, index) => ({
    ...sample,
    ...images[index],
  }))
  const networkIdle = fulfilled(settled)
  fulfilled(completed)
  const finalSnapshot = await snapshot(page)
  const file = path.join(output, "settled.png")
  await screenshot(page, file)
  captured.push({
    elapsed: Date.now() - start,
    snapshot: finalSnapshot,
    screenshot: file,
    screenshotElapsed: Date.now() - start,
  })
  return { samples: captured, networkIdle }
}
