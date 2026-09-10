import { installHttpFixtures } from "./response.mjs"
import { installSocketFixtures } from "./socket.mjs"

export function wrapFaultBrowser(browser, options = {}) {
  const config = {
    faultRules: [],
    onLog: () => {},
    queryRules: [],
    mutationFailures: [],
    signoutFixture: false,
    ...options,
  }
  return new Proxy(browser, {
    get(target, property) {
      if (property === "newContext") {
        return async (...args) =>
          wrapContext(await target.newContext(...args), config)
      }
      return bound(target, property)
    },
  })
}

function wrapContext(context, config) {
  return new Proxy(context, {
    get(target, property) {
      if (property === "newPage") {
        return async (...args) =>
          configurePage(await target.newPage(...args), target, config)
      }
      return bound(target, property)
    },
  })
}

async function configurePage(page, context, config) {
  const state = {
    navigations: 0,
    armed: false,
    released: false,
    used: new Set(),
  }
  wrapNavigation(page, config, state)
  wrapRetry(page, config, state)
  await installHttpFixtures(page, context, config, state)
  if (config.queryRules.length || config.mutationFailures.length) {
    await installSocketFixtures(page, {
      armed: () => state.armed && !state.released,
      queryRules: config.queryRules,
      mutationFailures: config.mutationFailures,
      onLog: config.onLog,
    })
  }
  return page
}

function wrapNavigation(page, config, state) {
  const goto = page.goto.bind(page)
  page.goto = (...args) => {
    // The blank departure preserves cache and must not arm primer responses.
    if (args[0] !== "about:blank") {
      state.navigations += 1
      state.armed = config.condition === "cold" || state.navigations >= 2
    }
    return goto(...args)
  }
}

function wrapRetry(page, config, state) {
  if (!config.releaseOnSelector) {
    return
  }
  const locate = page.locator.bind(page)
  page.locator = (selector, ...args) => {
    const locator = locate(selector, ...args)
    if (selector !== config.releaseOnSelector) {
      return locator
    }
    return new Proxy(locator, {
      get(target, property) {
        if (property !== "click") {
          return bound(target, property)
        }
        return (...clickArgs) => {
          state.released = true
          config.onLog({ kind: "fault-cleared-for-retry" })
          return target.click(...clickArgs)
        }
      },
    })
  }
}

function bound(target, property) {
  const value = target[property]
  return typeof value === "function" ? value.bind(target) : value
}
