import { createServer } from "node:http"
import { chromium } from "playwright"
import { expect, test } from "vitest"
import { settle, trackNetwork } from "./network"

test.each([
  "already pending",
  "next task",
])("settling includes SPA requests that start %s after the old load event", async (timing) => {
  const server = createServer((request, response) => {
    if (request.url === "/result") {
      setTimeout(() => response.end("Completed response"), 4500)
    } else {
      response.end(
        '<!doctype html><button>Fetch</button><div id="result">Initial</div>'
      )
    }
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Expected HTTP test port")
  }
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    trackNetwork(page)
    await page.goto(`http://127.0.0.1:${address.port}`)
    await page.waitForLoadState("networkidle")
    const started = page.waitForRequest((request) =>
      request.url().endsWith("/result")
    )
    await page.evaluate((nextTask) => {
      const fetchResult = async () => {
        const text = await fetch("/result").then((response) => response.text())
        const result = document.querySelector("#result")
        if (result) {
          result.textContent = text
        }
      }
      if (nextTask) {
        setTimeout(() => void fetchResult(), 100)
      } else {
        void fetchResult()
      }
    }, timing === "next task")
    if (timing === "already pending") {
      await started
    }
    const begin = Date.now()
    expect(await settle(page)).toBe(true)
    await started
    expect(await page.locator("#result").textContent()).toBe(
      "Completed response"
    )
    expect(Date.now() - begin).toBeGreaterThan(7400)
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}, 20_000)
