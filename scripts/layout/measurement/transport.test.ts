import { createServer } from "node:http"
import { chromium } from "playwright"
import { expect, test } from "vitest"
import { installClipboard, installResponses } from "./transport"

test("response fixtures preserve the second-visit asset cache and isolate clipboard writes", async () => {
  const { server, counts } = cacheServer()
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Expected HTTP test port")
  }
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const origin = `http://127.0.0.1:${address.port}`
    const errors: string[] = []
    const events = await installResponses(
      page,
      {
        id: "cache",
        title: "Cache proof",
        path: "/",
        mutating: false,
        responses: [{ url: `${origin}/api/*`, body: '{"fixture":true}' }],
      },
      (message) => errors.push(message)
    )
    await installClipboard(page, { text: "Initial local text" })
    for (let visit = 0; visit < 2; visit++) {
      await page.goto(origin)
      expect(await page.getAttribute("body", "data-loaded")).toBe("true")
      expect(
        await page.evaluate(() =>
          fetch("/api/value").then((response) => response.json())
        )
      ).toEqual({ fixture: true })
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        "Initial local text"
      )
      await page.evaluate(() => navigator.clipboard.writeText("Copied locally"))
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        "Copied locally"
      )
    }
    expect(counts.script).toBe(1)
    expect(counts.api).toBe(0)
    expect(events).toHaveLength(2)
    expect(errors).toEqual([])
  } finally {
    await browser.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

function cacheServer() {
  const counts = { script: 0, api: 0 }
  const server = createServer((request, response) => {
    if (request.url === "/cached.js") {
      counts.script++
      response.writeHead(200, {
        "Content-Type": "text/javascript",
        "Cache-Control": "public,max-age=3600",
      })
      response.end('document.body.dataset.loaded="true"')
    } else if (request.url === "/api/value") {
      counts.api++
      response.end("Unexpected real request")
    } else {
      response.setHeader("Content-Type", "text/html")
      response.end(
        '<!doctype html><body>Cached page<script src="/cached.js"></script></body>'
      )
    }
  })
  return { server, counts }
}
