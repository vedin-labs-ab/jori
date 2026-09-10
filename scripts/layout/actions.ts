import { type Page } from "playwright"
import { type Readiness, type Step } from "./types.ts"

export async function perform(page: Page, step: Step) {
  const locator = page.locator(step.selector ?? "body")
  switch (step.action) {
    case "click":
      await locator.click({ timeout: 8000 })
      break
    case "doubleclick":
      await locator.dblclick({ timeout: 8000 })
      break
    case "contextclick":
      await locator.click({ button: "right", timeout: 8000 })
      break
    case "fill":
      await locator.fill(step.value ?? "", { timeout: 8000 })
      break
    case "select":
      await locator.selectOption(step.value ?? "", { timeout: 8000 })
      break
    case "press":
      await locator.press(step.value ?? "Escape", { timeout: 8000 })
      break
    case "hover":
      await locator.hover({ timeout: 8000 })
      break
    case "navigate":
      await page.goto(step.value ?? "/", { waitUntil: "domcontentloaded" })
      break
    case "scroll":
      await locator.evaluate(
        (node, value) => node.scrollBy(0, Number(value)),
        step.value
      )
      break
    case "scrollIntoView":
      await locator.evaluate((node) => node.scrollIntoView({ block: "end" }))
      break
    case "back":
      await page.goBack({ waitUntil: "domcontentloaded" })
      break
    case "reload":
      await page.reload({ waitUntil: "domcontentloaded" })
      break
    case "drag":
      await drag(page, step)
      break
  }
}

export async function waitReady(page: Page, conditions: Readiness[] = []) {
  await Promise.all(
    conditions.map((condition) => waitCondition(page, condition))
  )
}

async function waitCondition(
  page: Page,
  { selector, state = "visible", timeout = 15_000 }: Readiness
) {
  if (/:(visible|hidden)\b/.test(selector)) {
    throw new Error(
      "Use readiness state instead of visibility selector pseudos"
    )
  }
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const ready = await page
        .locator(selector)
        .evaluateAll((nodes, requested) => {
          // Querying DOM/text is passive; measure visibility only after this
          // document painted. A locator visibility wait can style-walk too early.
          if (!performance.getEntriesByType("paint").length) {
            return false
          }
          if (requested === "attached") {
            return nodes.length > 0
          }
          if (requested === "detached") {
            return nodes.length === 0
          }
          const visible = nodes.some((node) => {
            const rect = node.getBoundingClientRect()
            const visibility = getComputedStyle(node).visibility
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              visibility !== "hidden" &&
              visibility !== "collapse"
            )
          })
          return requested === "visible" ? visible : !visible
        }, state)
      if (ready) {
        return
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
    await page.waitForTimeout(25)
  }
  throw new Error(`Readiness timed out (${state}): ${selector}`)
}

async function drag(page: Page, step: Step) {
  const locator = page.locator(step.selector ?? "body")
  const box = await locator.boundingBox()
  if (!box || !step.offset) {
    throw new Error("Drag requires a visible element and offset")
  }
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + step.offset.x, y + step.offset.y, { steps: 10 })
  await page.mouse.up()
}
