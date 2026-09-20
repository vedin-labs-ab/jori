import { type Page } from "playwright"
import { afterAll, beforeAll, expect, test } from "vitest"
import { openFixture } from "./fixture/browser.ts"

let fixture: Awaited<ReturnType<typeof openFixture>>
beforeAll(async () => {
  fixture = await openFixture("page.html")
}, 30000)
afterAll(() => fixture?.close())

// The sidebar's head, under a real pointer and a real compositor: what is
// on screen in each frame, which no DOM test can see.

type Frame = {
  /** The organization's square. */
  square: number
  /** The button that opens the sidebar, once the rail has one. */
  expand: number | undefined
  /** A tooltip drawn where no button is: the window's corner. */
  strayTooltip: boolean
}

async function openConsole() {
  const page = await fixture.browser.newPage({
    viewport: { width: 1280, height: 800 },
  })
  page.setDefaultTimeout(5000)
  await page.goto(`${fixture.url}?path=/chat`)
  await page.getByRole("button", { name: "Close sidebar" }).waitFor()

  return page
}

/** Records every frame until `frames` is read. */
async function record(page: Page) {
  await page.evaluate(() => {
    const frames: Frame[] = []
    const opacity = (element: Element | null | undefined) =>
      element ? Number(getComputedStyle(element).opacity) : undefined
    const tick = () => {
      const head = document.querySelector(".group\\/expand")
      const tooltip = document.querySelector("[data-slot=tooltip-content]")

      frames.push({
        square: opacity(head?.firstElementChild) ?? 1,
        expand: opacity(head?.querySelector("[aria-label='Open sidebar']")),
        strayTooltip:
          tooltip !== null &&
          getComputedStyle(tooltip).visibility === "visible" &&
          tooltip.getBoundingClientRect().x < 50,
      })
      requestAnimationFrame(tick)
    }

    Object.assign(window, { frames })
    requestAnimationFrame(tick)
  })

  return () =>
    page.evaluate(() => (window as unknown as { frames: Frame[] }).frames)
}

async function center(page: Page, name: string) {
  const box = await page.getByRole("button", { name }).boundingBox()

  if (box === null) {
    throw new Error(`${name} is not on screen`)
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test("closing the sidebar under a resting pointer leaves its head alone", async () => {
  const page = await openConsole()

  try {
    const close = await center(page, "Close sidebar")
    await page.mouse.move(close.x, close.y)
    // Long enough for the button's tooltip to be fully open.
    await page.waitForTimeout(400)
    const frames = await record(page)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(500)

    // The row folds under the pointer for a moment. The square must not
    // take that for a hover, and the tooltip of the button that was
    // clicked must not outlive it somewhere else.
    for (const frame of await frames()) {
      expect(frame).toMatchObject({ square: 1, strayTooltip: false })
    }
  } finally {
    await page.close()
  }
})

test("the rail's square and the button that opens the sidebar swap in one frame", async () => {
  const page = await openConsole()

  try {
    await page.getByRole("button", { name: "Close sidebar" }).click()
    await page.mouse.move(640, 400)
    await page.waitForTimeout(400)
    const frames = await record(page)
    await page.mouse.move(32, 32)
    await page.waitForTimeout(300)
    await page.mouse.move(640, 400)
    await page.waitForTimeout(300)

    // One of the two, whole, in every frame: never neither, never both.
    const swaps = (await frames()).map(
      ({ expand, square }) => `${square}/${expand}`
    )
    expect(new Set(swaps)).toEqual(new Set(["1/0", "0/1"]))
  } finally {
    await page.close()
  }
})

test("a tooltip in the header's row stays clear of the button beside it", async () => {
  const page = await openConsole()

  try {
    const search = await center(page, "Search workspace")
    await page.mouse.move(search.x, search.y)
    const tooltip = await page
      .locator("[data-slot=tooltip-content]")
      .boundingBox()
    const close = await page
      .getByRole("button", { name: "Close sidebar" })
      .boundingBox()

    // Below the row, so a pointer crossing search on its way to the next
    // button finds that button uncovered.
    expect(tooltip?.y).toBeGreaterThanOrEqual(
      (close?.y ?? 0) + (close?.height ?? 0)
    )
  } finally {
    await page.close()
  }
})
