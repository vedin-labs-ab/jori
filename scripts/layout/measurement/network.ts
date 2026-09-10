import { type Page, type Request } from "playwright"

type Activity = { pending: Set<Request>; changed: number }
const pages = new WeakMap<Page, Activity>()

/** Attach before navigation: load-state events do not describe later SPA work. */
export function trackNetwork(page: Page) {
  const existing = pages.get(page)
  if (existing) {
    return existing
  }
  const activity: Activity = { pending: new Set(), changed: Date.now() }
  pages.set(page, activity)
  page.on("request", (request) => {
    if (["websocket", "eventsource"].includes(request.resourceType())) {
      return
    }
    activity.pending.add(request)
    activity.changed = Date.now()
  })
  const finish = (request: Request) => {
    if (activity.pending.delete(request)) {
      activity.changed = Date.now()
    }
  }
  page.on("requestfinished", finish)
  page.on("requestfailed", finish)
  return activity
}

/** A fresh 500ms network-idle interval followed by 3s without new work. */
export async function settle(page: Page) {
  const activity = trackNetwork(page)
  const start = Date.now()
  while (Date.now() - start < 18_000) {
    if (
      activity.pending.size === 0 &&
      Date.now() - Math.max(start, activity.changed) >= 3500
    ) {
      return true
    }
    await page.waitForTimeout(25)
  }
  return false
}
