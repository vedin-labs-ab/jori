import { readFile } from "node:fs/promises"
import path from "node:path"
import { type Browser, type Page } from "playwright"
import { perform } from "./actions.ts"
import { samples, screenshot, settle } from "./capture.ts"
import { compare } from "./diff.ts"
import { type Scenario, type Shift, type Snapshot } from "./types.ts"

export type RunOptions = {
  condition: "cold" | "warm"
  width: number
  output: string
  app: string
  fixture: string
  storage?: string
}

function urlFor(scenario: Scenario, options: RunOptions) {
  return scenario.target === "app"
    ? new URL(scenario.path, options.app).href
    : `${options.fixture}/scripts/layout/page.html?path=${encodeURIComponent(scenario.path)}`
}

async function configure(page: Page, scenario: Scenario, options: RunOptions) {
  const probe = await readFile(
    path.join(import.meta.dirname, "probe.js"),
    "utf8"
  )
  await page.addInitScript({
    content: `${probe}\nwindow.__mark(${JSON.stringify(scenario.id)})`,
  })
  for (const response of scenario.responses ?? []) {
    await page.route(response.url, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, response.delay ?? 0))
      await route.fulfill({
        contentType: "application/json",
        status: response.status ?? 200,
        body: response.body,
      })
    })
  }
  if (options.condition === "cold") {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Network.enable")
    await cdp.send("Network.clearBrowserCache")
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true })
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200_000,
      uploadThroughput: 90_000,
    })
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  }
}

export async function drive(
  browser: Browser,
  scenario: Scenario,
  options: RunOptions
) {
  const context = await createContext(browser, scenario, options)
  try {
    const page = await context.newPage()
    const errors: string[] = []
    const shifts: Shift[] = []
    await page.exposeFunction("__layoutRecord", (entry: Shift) => {
      shifts.push(entry)
    })
    page.on("pageerror", (error) => errors.push(error.message))
    await configure(page, scenario, options)
    const url = urlFor(scenario, options)
    if (options.condition === "warm") {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 })
      await settle(page)
    }
    shifts.length = 0
    errors.length = 0
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 })
    let before: Snapshot | undefined
    if (scenario.steps?.length) {
      await settle(page)
      for (const step of scenario.setup ?? []) {
        await perform(page, step)
      }
      await settle(page)
      before = await page.evaluate(() => window.__layout.snapshot())
      await screenshot(page, path.join(options.output, "before.png"))
      await page.evaluate((id) => {
        window.__layout.shifts.length = 0
        window.__mark(id)
      }, scenario.id)
      shifts.length = 0
      for (const step of scenario.steps) {
        await perform(page, step)
      }
    }
    const captured = await samples(page, options.output)
    const first = captured.samples[0].snapshot
    return {
      ...captured,
      before,
      actionDelta: before ? compare(before, first) : undefined,
      url: page.url(),
      errors,
      shifts,
      diffs: captured.samples
        .slice(1)
        .map((sample) => compare(first, sample.snapshot)),
    }
  } finally {
    await context.close()
  }
}

async function createContext(
  browser: Browser,
  scenario: Scenario,
  options: RunOptions
) {
  return await browser.newContext({
    viewport: {
      width: options.width,
      height: options.width === 375 ? 812 : 900,
    },
    storageState: scenario.anonymous ? undefined : options.storage,
    reducedMotion: "no-preference",
    locale: "en-US",
    timezoneId: "Europe/Stockholm",
    deviceScaleFactor: 1,
  })
}
