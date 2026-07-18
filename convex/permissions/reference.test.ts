import { expect, test } from "vitest"
import { resolveToolReference } from "./reference"

test("shaped results carry an authored response schema", () => {
  const reference = resolveToolReference("google_calendar_list_events")

  expect(reference.request).toMatchObject({ type: "object" })
  expect(JSON.stringify(reference.response)).toContain("entityKey")
  expect(JSON.stringify(reference.response)).toContain("contentHash")
})

test("passthrough tools fall back to an honest response note", () => {
  const reference = resolveToolReference("google_gmail_search_threads")

  expect(reference.request).toMatchObject({ type: "object" })
  expect(reference.response).toEqual({
    description: "The raw response for this call, returned unchanged.",
  })
})

test("unknown tools are rejected", () => {
  expect(() => resolveToolReference("missing_tool")).toThrow("Unknown tool.")
})

test("native agent tools resolve with authored responses", () => {
  const reference = resolveToolReference("wait_for_agents")

  expect(reference.request).toMatchObject({ type: "object" })
  expect(JSON.stringify(reference.response)).toContain("finish_run")

  expect(JSON.stringify(resolveToolReference("bash").response)).toContain(
    "returned unchanged"
  )
})
