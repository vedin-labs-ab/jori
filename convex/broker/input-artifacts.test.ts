import { expect, test } from "vitest"
import { normalizeBrokerToolInput, normalizeMiloToolInput } from "./input"

test("milo input passes built artifact publish payloads through unvalidated", () => {
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
  expect(() => normalizeBrokerToolInput("create_artifact", prepared)).toThrow(
    "create_artifact.workspacePath is required"
  )
  expect(normalizeMiloToolInput("create_artifact", prepared)).toBe(prepared)
  expect(
    normalizeMiloToolInput("update_artifact", { ...prepared, artifactId: "a1" })
  ).toMatchObject({ artifactId: "a1" })
})

test("milo input still validates non-publish tools against their schema", () => {
  expect(
    normalizeMiloToolInput("search_artifacts", { limit: 5 })
  ).toMatchObject({ limit: 5 })
  expect(() =>
    normalizeMiloToolInput("search_artifacts", { limit: "lots" })
  ).toThrow("search_artifacts.limit must be a number")
})
