import { type Page } from "playwright"
import { type Step } from "./types.ts"

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
