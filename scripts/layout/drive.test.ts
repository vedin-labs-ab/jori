import { mkdtemp, rm } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"
import { chromium } from "playwright"
import { expect, it } from "vitest"
import { drive } from "./drive"

it("measures a new document on a warm fragment visit and preserves cached assets", async () => {
  const counts = { document: 0, script: 0 }
  const server = createServer((request, response) => {
    if (request.url === "/cached.js") {
      counts.script++
      response.writeHead(200, {
        "Content-Type": "text/javascript",
        "Cache-Control": "public,max-age=3600",
      })
      response.end("document.body.dataset.loaded='true'")
    } else {
      counts.document++
      response.writeHead(200, {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      })
      response.end(
        `<!doctype html><p>Visit ${counts.document}</p><script src="/cached.js"></script>`
      )
    }
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Expected a test HTTP port")
  }
  const browser = await chromium.launch()
  const output = await mkdtemp(path.join(tmpdir(), "layout-warm-fragment-"))
  try {
    const result = await drive(
      browser,
      {
        id: "warm-fragment",
        title: "Warm fragment document",
        path: "/#section",
        target: "app",
        mutating: false,
        ready: [{ selector: 'body[data-loaded="true"] p:text-is("Visit 2")' }],
      },
      {
        condition: "warm",
        width: 375,
        output,
        app: `http://127.0.0.1:${address.port}`,
        fixture: "",
      }
    )
    expect(counts.script).toBe(1)
    expect(
      result.samples.every((sample) =>
        sample.snapshot.nodes.some((node) => node.text === "Visit 2")
      )
    ).toBe(true)
    expect(result.url).toMatch(/\/#section$/)
  } finally {
    await browser.close()
    await rm(output, { recursive: true, force: true })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}, 30_000)

it("waits for the new document's paint after an action navigates", async () => {
  const server = await delayedStylesheet()
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Expected a test HTTP port")
  }
  const browser = await chromium.launch()
  const output = await mkdtemp(path.join(tmpdir(), "layout-navigation-"))
  try {
    const result = await drive(
      browser,
      {
        id: "navigate-paint",
        title: "Navigation paint",
        path: "/",
        target: "app",
        mutating: false,
        steps: [{ action: "click", selector: "a" }],
        ready: [{ selector: 'button:text-is("Stable button")' }],
      },
      {
        condition: "cold",
        width: 375,
        output,
        app: `http://127.0.0.1:${address.port}`,
        fixture: "",
      }
    )
    expect(result.shifts).toEqual([])
    expect(result.diffs.flatMap((diff) => diff.rects)).toEqual([])
    expect(
      result.samples.every((sample) =>
        sample.snapshot.nodes.some(
          (node) => node.text === "Stable button" && node.box.width === 192
        )
      )
    ).toBe(true)
  } finally {
    await browser.close()
    await rm(output, { recursive: true, force: true })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}, 30_000)

it.each(["page load", "setup action"])(
  "observes %s through natural completion with no action steps",
  async (origin) => {
    const server = createServer((_request, response) => {
      response.setHeader("Content-Type", "text/html")
      const expire =
        "setTimeout(()=>document.querySelector('p').textContent='Idle',1800)"
      response.end(
        origin === "page load"
          ? `<!doctype html><p>Saved</p><script>${expire}</script>`
          : `<!doctype html><button onclick="document.querySelector('p').textContent='Saved';${expire}">Save</button><p>Initial</p>`
      )
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("Expected a test HTTP port")
    }
    const browser = await chromium.launch()
    const output = await mkdtemp(path.join(tmpdir(), "layout-completion-"))
    try {
      const result = await drive(
        browser,
        {
          id: "completion",
          title: "Saved expires",
          path: "/",
          target: "app",
          mutating: false,
          setup:
            origin === "page load"
              ? []
              : [{ action: "click", selector: "button" }],
          setupReady: [{ selector: 'p:text-is("Saved")' }],
          steps: [],
          ready: [{ selector: 'p:text-is("Idle")' }],
        },
        {
          condition: "warm",
          width: 375,
          output,
          app: `http://127.0.0.1:${address.port}`,
          fixture: "",
        }
      )
      expect(result.before?.nodes.some((node) => node.text === "Saved")).toBe(
        true
      )
      expect(
        result.samples[0].snapshot.nodes.some((node) => node.text === "Saved")
      ).toBe(true)
      expect(
        result.samples
          .at(-1)
          ?.snapshot.nodes.some((node) => node.text === "Idle")
      ).toBe(true)
    } finally {
      await browser.close()
      await rm(output, { recursive: true, force: true })
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  },
  30_000
)

it("does not trigger layout transitions before blocking CSS has painted", async () => {
  const server = await delayedStylesheet()
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Expected a test HTTP port")
  }
  const browser = await chromium.launch()
  const output = await mkdtemp(path.join(tmpdir(), "layout-paint-"))
  try {
    const result = await drive(
      browser,
      {
        id: "paint",
        title: "Blocking CSS",
        path: "/",
        target: "app",
        mutating: false,
      },
      {
        condition: "cold",
        width: 375,
        output,
        app: `http://127.0.0.1:${address.port}`,
        fixture: "",
      }
    )
    expect(result.shifts).toEqual([])
    expect(result.diffs.flatMap((diff) => diff.rects)).toEqual([])
    expect(
      result.samples[0].snapshot.nodes.some(
        (node) => node.text === "Stable button"
      )
    ).toBe(true)
  } finally {
    await browser.close()
    await rm(output, { recursive: true, force: true })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}, 30_000)

async function delayedStylesheet() {
  const server = createServer((request, response) => {
    if (request.url === "/style.css") {
      setTimeout(() => {
        response.writeHead(200, { "Content-Type": "text/css" })
        response.end(
          "body{margin:0}button{width:12rem;height:2.5rem;border:1px solid transparent;transition:all .15s}"
        )
      }, 500)
    } else {
      response.writeHead(200, { "Content-Type": "text/html" })
      response.end(
        '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><button>Stable button</button><a href="/next">Next document</a></body></html>'
      )
    }
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  return server
}
