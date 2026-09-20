import { type Browser, type Locator, type Page } from "playwright"
import { afterAll, beforeAll, expect, test } from "vitest"
import { openFixture } from "../fixture/browser.ts"

let fixture: Awaited<ReturnType<typeof openFixture>>
let browser: Browser
let url: string
beforeAll(async () => {
  fixture = await openFixture("focus/page.html")
  browser = fixture.browser
  url = fixture.url
}, 30000)
afterAll(() => fixture?.close())

async function selectFolder(page: Page, nested: boolean, touch = false) {
  const activate = (item: Locator) => (touch ? item.tap() : item.click())
  if (nested) {
    await activate(
      page.getByRole("button", { name: "Open actions for Engineering" })
    )
    const submenu = page.getByRole("menuitem", { name: "New", exact: true })
    await (touch ? submenu.tap() : submenu.hover())
  } else {
    await activate(page.getByRole("button", { name: "New", exact: true }))
  }
  const item = page.getByRole("menuitem", {
    name: nested ? "Subfolder" : "New folder",
    exact: true,
  })
  await activate(item)
  // Cross the still-mounted menu during its exit animation, as a person
  // moving toward the new row would. A stationary automation misses the bug.
  if (!touch) {
    await page.mouse.move(100, 500, { steps: 8 })
  }
}
async function expectEditor(page: Page) {
  const input = page.getByRole("textbox", { name: "Folder name" })
  await input.waitFor()
  await page.waitForTimeout(250)
  expect(
    await input.evaluate((node: HTMLInputElement) => ({
      focused: node === document.activeElement,
      selection: [node.selectionStart, node.selectionEnd],
      name: node.value,
    }))
  ).toEqual({ focused: true, selection: [0, 10], name: "New folder" })
  expect(
    await input.evaluate((node) => {
      const viewport = node.closest('[data-sidebar="group-content"]')
      if (!viewport) {
        return false
      }
      const row = node.getBoundingClientRect()
      const bounds = viewport.getBoundingClientRect()
      return row.top >= bounds.top && row.bottom <= bounds.bottom
    })
  ).toBe(true)
  return input
}

for (const nested of [false, true]) {
  test(`${nested ? "Subfolder" : "Folders +"} keeps rename focused through menu exit, query arrival and tree scrolling`, async () => {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    })
    page.setDefaultTimeout(5000)
    page.on("pageerror", (error) => console.error(error))
    try {
      for (const [create, query] of [
        [0, 0],
        [30, 0],
        [75, 0],
        [150, 0],
        [0, 75],
        [0, 180],
      ]) {
        await page.goto(`${url}?create=${create}&query=${query}`)
        await selectFolder(page, nested)
        const input = await expectEditor(page)
        await input.fill("Renamed folder")
        await input.press("Enter")
        await input.waitFor({ state: "hidden" })
        expect(
          await page
            .getByRole("link", { name: "Renamed folder", exact: true })
            .count()
        ).toBe(1)
      }
    } finally {
      await page.close()
    }
  }, 30000)
}

for (const width of [390, 768, 1440]) {
  test(`repeated folder creation at ${width}px preserves keyboard, cancel and click-away behavior`, async () => {
    const page = await browser.newPage({
      viewport: { width, height: 800 },
      hasTouch: width === 390,
      reducedMotion: "reduce",
    })
    page.setDefaultTimeout(5000)
    try {
      await page.goto(url)
      await page.evaluate(() => document.documentElement.classList.add("dark"))
      if (width < 768) {
        await page.getByRole("button", { name: "Toggle Sidebar" }).click()
      }
      for (let attempt = 0; attempt < 10; attempt++) {
        const nested = attempt % 2 === 1
        await selectFolder(page, nested, width === 390)
        const input = await expectEditor(page)
        await input.fill(`Folder attempt ${attempt}`)
        if (attempt % 3 === 0) {
          await input.press("Escape")
          await input.waitFor({ state: "hidden" })
          expect(
            await page
              .getByRole("link", {
                name: `Folder attempt ${attempt}`,
                exact: true,
              })
              .count()
          ).toBe(0)
        } else {
          await page.getByRole("button", { name: "Elsewhere" }).click()
          await input.waitFor({ state: "hidden" })
          expect(
            await page
              .getByRole("button", { name: "Elsewhere" })
              .evaluate((node) => node === document.activeElement)
          ).toBe(true)
          expect(
            await page
              .getByRole("link", {
                name: `Folder attempt ${attempt}`,
                exact: true,
              })
              .count()
          ).toBe(1)
        }
      }
      await keyboardCreation(page)
      if (width < 768) {
        await page.keyboard.press("Escape")
        await page.getByRole("dialog").waitFor({ state: "hidden" })
      }
    } finally {
      await page.close()
    }
  }, 30000)
}

async function keyboardCreation(page: Page) {
  const plus = page.getByRole("button", { name: "New", exact: true })
  await plus.press("Enter")
  await page
    .getByRole("menuitem", { name: "New folder", exact: true })
    .press("Enter")
  const input = await expectEditor(page)
  await input.fill("Keyboard folder")
  await input.press("Enter")
  await input.waitFor({ state: "hidden" })
  await page.waitForFunction(
    () => document.activeElement?.textContent === "Keyboard folder"
  )
  await plus.press("Enter")
  await page.keyboard.press("Escape")
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "New"
  )
}
