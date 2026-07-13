import { expect, test } from "vitest"
import { normalizeBrokerToolInput } from "."

test("broker input validation requires one run search mode", () => {
  expect(
    normalizeBrokerToolInput("search_runs", {
      mode: "search",
      query: "prior context",
    })
  ).toMatchObject({ mode: "search" })

  expect(
    normalizeBrokerToolInput("search_runs", {
      mode: "ids",
      runIds: ["run_1"],
    })
  ).toMatchObject({ mode: "ids" })

  expect(() => normalizeBrokerToolInput("search_runs", {})).toThrow(
    "search_runs.mode is required"
  )
  expect(() =>
    normalizeBrokerToolInput("search_runs", {
      mode: "search",
      runIds: ["run_1"],
    })
  ).toThrow("search_runs.runIds is not supported")
  expect(() =>
    normalizeBrokerToolInput("search_runs", {
      mode: "ids",
      runIds: [],
    })
  ).toThrow("search_runs.runIds must contain at least 1 item")
  expect(() =>
    normalizeBrokerToolInput("search_runs", {
      mode: "ids",
      query: "prior context",
      runIds: ["run_1"],
    })
  ).toThrow("search_runs.query is not supported")
})
