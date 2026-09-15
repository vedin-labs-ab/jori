import { once } from "node:events"
import { mkdtemp, rm } from "node:fs/promises"
import { type Server } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { type Browser, chromium, type Page } from "playwright"
import { build } from "vite"
import { afterAll, beforeAll, expect, test } from "vitest"
import { serve } from "./http.ts"

let browser: Browser
let server: Server
let directory: string
let url: string
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "jori-mentions-"))
  await build({
    configFile: false,
    envDir: false,
    logLevel: "silent",
    define: { "import.meta.env.VITE_JORI_REGION": JSON.stringify("us") },
    plugins: [tailwindcss(), react()],
    resolve: { tsconfigPaths: true },
    build: {
      outDir: directory,
      emptyOutDir: true,
      rolldownOptions: { input: path.join(import.meta.dirname, "page.html") },
    },
  })
  server = serve(directory, 0)
  await once(server, "listening")
  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Missing fixture port")
  }
  url = `http://127.0.0.1:${address.port}/scripts/layout/page.html`
  browser = await chromium.launch()
}, 30000)
afterAll(async () => {
  await browser?.close()
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  if (directory) {
    await rm(directory, { recursive: true, force: true })
  }
})

// The real demo renders the shared console pages. Exercise its clipped,
// transformed landing frame as well as the full-window console layout.
for (const embedded of [false, true]) {
  for (const width of [390, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      test(`${embedded ? "landing" : "console"} mention pickers fit at ${width}px in ${theme}`, async () => {
        const page = await browser.newPage({
          viewport: { width, height: width === 390 ? 360 : 720 },
          reducedMotion: "reduce",
        })
        page.setDefaultTimeout(5000)
        try {
          await page.goto(`${url}?path=/chat`)
          const field = page.getByRole("textbox", { name: "Message" })
          await field.waitFor()
          await page.evaluate(
            ({ embedded, theme }) => {
              document.documentElement.classList.toggle(
                "dark",
                theme === "dark"
              )
              if (embedded) {
                const frame = document.querySelector<HTMLElement>("#root [id]")
                if (!frame) {
                  throw new Error("Missing console frame")
                }
                frame.style.height = "360px"
                frame.style.margin = "24px"
                frame.style.transform = "scale(0.9)"
                frame.style.transformOrigin = "top left"
              }
            },
            { embedded, theme }
          )
          await selectEachKind(page)
          await field.fill("+")
          await expectPopup(page)
          await page.setViewportSize({ width: 320, height: 280 })
          await expectPopup(page)
          await field.press("Escape")
          await page.getByRole("listbox").waitFor({ state: "hidden" })
          expect(await field.innerText()).toBe("+")
        } finally {
          await page.close()
        }
      }, 30000)
    }
  }
}

/** The popover has come to rest where it can be used: inside the viewport
 *  by the collision padding, its corner on top of the stack (a box in the
 *  viewport can still sit under the frame header), and in the same place
 *  on two frames running. Radix places a popover in passes, and a caret
 *  reveal scrolls in eased steps, so a single reading can land mid-move. */
async function expectPopup(page: Page) {
  const listbox = page.getByRole("listbox")
  await listbox.waitFor()
  const problem = await listbox.evaluate((list) => {
    const popup = list.closest<HTMLElement>('[data-slot="popover-content"]')
    const read = () => {
      const box = popup?.getBoundingClientRect()
      const clear =
        popup !== null &&
        box !== undefined &&
        box.width > 0 &&
        box.height > 0 &&
        box.left >= 7 &&
        box.top >= 7 &&
        box.right <= window.innerWidth - 7 &&
        box.bottom <= window.innerHeight - 7 &&
        popup.contains(document.elementFromPoint(box.left + 8, box.top + 8))
      const place = box
        ? [box.left, box.top, box.right, box.bottom].map(Math.round).join()
        : "no box"
      return { clear, place }
    }
    return new Promise<string | null>((resolve) => {
      const deadline = performance.now() + 5000
      let last = ""
      const frame = () => {
        const { clear, place } = read()
        if (clear && place === last) {
          resolve(null)
        } else if (performance.now() > deadline) {
          resolve(
            `${place} in ${window.innerWidth}x${window.innerHeight}, page scrolled ${window.scrollY}`
          )
        } else {
          last = clear ? place : ""
          requestAnimationFrame(frame)
        }
      }
      requestAnimationFrame(frame)
    })
  })
  expect(problem).toBeNull()
}

test("an open picker follows scrolling and dismisses without taking editor focus", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 360 } })
  page.setDefaultTimeout(5000)
  try {
    await page.goto(`${url}?path=/chat`)
    const field = page.getByRole("textbox", { name: "Message" })
    await field.fill("+")
    await expectPopup(page)
    await field.evaluate((node) => {
      let parent = node.parentElement
      while (parent) {
        if (
          getComputedStyle(parent).overflowY === "auto" &&
          parent.scrollHeight > parent.clientHeight
        ) {
          parent.scrollTop += 20
          return
        }
        parent = parent.parentElement
      }
      throw new Error("Expected the short chat page to scroll")
    })
    await page.waitForFunction(() => {
      const popup = document.querySelector('[data-slot="popover-content"]')
      const selection = window.getSelection()
      if (!popup || !selection?.rangeCount) {
        return false
      }
      const caret = selection.getRangeAt(0).getBoundingClientRect()
      const box = popup.getBoundingClientRect()
      return popup.getAttribute("data-side") === "top"
        ? Math.abs(box.bottom + 4 - caret.top) < 2
        : Math.abs(box.top - 4 - caret.bottom) < 2
    })
    await expectPopup(page)
    await page.getByRole("option").first().click()
    await page.getByRole("listbox").waitFor({ state: "hidden" })
    expect(await field.locator("[data-mention-kind]").count()).toBe(1)
    await field.fill("+")
    await expectPopup(page)
    await page.getByRole("heading", { name: "New chat" }).click()
    await page.getByRole("listbox").waitFor({ state: "hidden" })
    expect(await field.innerText()).toBe("+")
    await field.fill("")
    await page.getByRole("button", { name: "Mention a resource" }).click()
    await page.getByRole("option", { name: /Tables/ }).click()
    await page.getByRole("option", { name: "Customer renewals" }).click()
    expect(await field.locator("[data-mention-kind]").count()).toBe(1)
  } finally {
    await page.close()
  }
}, 30000)

async function selectEachKind(page: Page) {
  const field = page.getByRole("textbox", { name: "Message" })
  // Filling leaves the caret after the sigil. No End after it: on macOS End
  // scrolls the nearest scroller to its end instead of moving the caret,
  // which took the caret, and the picker anchored to it, off the screen.
  for (const sigil of ["+", "@", "#", "/"]) {
    await field.fill(sigil)
    await expectPopup(page)
    expect(
      await field.evaluate((node) => node === document.activeElement)
    ).toBe(true)
    const options = page.getByRole("option")
    const count = await options.count()
    expect(count).toBeGreaterThan(0)
    // Up wraps to the last row, which must scroll into view: the list's
    // own view, and never the page under it.
    const before = await scrollPositions(page)
    await field.press("ArrowUp")
    await page.waitForFunction(() => {
      const selected = document.querySelector(
        '[role="option"][aria-selected="true"]'
      )
      if (!selected) {
        return false
      }
      const box = selected.getBoundingClientRect()
      const popup = selected
        .closest('[data-slot="popover-content"]')
        ?.getBoundingClientRect()
      return (
        popup !== undefined &&
        box.top >= popup.top &&
        box.bottom <= popup.bottom
      )
    })
    await expectPopup(page)
    expect(await scrollPositions(page)).toEqual(before)
    await field.press("Tab")
    await page.getByRole("listbox").waitFor({ state: "hidden" })
    expect(await field.locator("[data-mention-kind]").count()).toBe(1)
    expect(
      await field.evaluate((node) => node === document.activeElement)
    ).toBe(true)
  }
}

/** The page's and the field's scroller's positions: a step through the
 *  list must move neither. */
function scrollPositions(page: Page) {
  return page.getByRole("textbox", { name: "Message" }).evaluate((field) => {
    let scroller = field.parentElement
    while (
      scroller !== null &&
      getComputedStyle(scroller).overflowY !== "auto"
    ) {
      scroller = scroller.parentElement
    }
    return [window.scrollX, window.scrollY, scroller?.scrollTop ?? 0]
  })
}
