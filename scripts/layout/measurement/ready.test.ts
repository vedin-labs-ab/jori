import { createServer } from "node:http"
import { chromium } from "playwright"
import { expect, test } from "vitest"
import { waitReady } from "../actions"

test("readiness polling does not read computed styles before first paint", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/style.css") {
      setTimeout(() => {
        response.setHeader("Content-Type", "text/css")
        response.end("button{width:192px;transition:all .15s}")
      }, 600)
    } else {
      response.setHeader("Content-Type", "text/html")
      response.end(
        '<!doctype html><link rel="stylesheet" href="/style.css"><button>Ready</button>'
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
    await page.addInitScript(() => {
      const original = window.getComputedStyle
      window.getComputedStyle = (element, pseudo) => {
        if (!performance.getEntriesByType("paint").length) {
          document.documentElement.dataset.earlyStyleRead = "true"
        }
        return original.call(window, element, pseudo)
      }
    })
    await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: "commit" })
    await waitReady(page, [{ selector: 'button:text-is("Ready")' }])
    expect(
      await page.locator("html").getAttribute("data-early-style-read")
    ).toBeNull()
    expect(
      await page
        .locator("button")
        .evaluate((button) => button.getBoundingClientRect().width)
    ).toBe(192)
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
