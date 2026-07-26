import { expect, test } from "vitest"
import { normalizeBrokerToolInput, normalizeJoriToolInput } from "."

test("jori input passes built app publish payloads through unvalidated", () => {
  const prepared = {
    title: "Inbox Triage",
    access: "personal",
    source: [
      { path: "src/App.tsx", content: "export const App = () => null\n" },
    ],
    build: { sourceHash: "abc", assets: [] },
    contract: { version: 1, state: [] },
  }

  // The worker swaps workspacePath for the built payload before publishing, so
  // the model-facing schema would reject it. The publish path must not run it.
  expect(() => normalizeBrokerToolInput("create_app", prepared)).toThrow(
    "create_app.source is not supported"
  )
  expect(normalizeJoriToolInput("create_app", prepared)).toBe(prepared)
  expect(
    normalizeJoriToolInput("update_app", { ...prepared, appId: "a1" })
  ).toMatchObject({ appId: "a1" })
})

test("jori input still validates non-publish tools against their schema", () => {
  expect(normalizeJoriToolInput("search_apps", { limit: 5 })).toMatchObject({
    limit: 5,
  })
  expect(() =>
    normalizeJoriToolInput("search_apps", { limit: "lots" })
  ).toThrow("search_apps.limit must be a number")
})
