import { isRedirect } from "@tanstack/react-router"
import { expect, test } from "vitest"
import { Route } from "./console"

function caughtBeforeLoad() {
  try {
    Route.options.beforeLoad?.({} as never)
  } catch (error) {
    return error
  }

  return undefined
}

test("the console entry path forwards to the runs list", () => {
  const thrown = caughtBeforeLoad()

  expect(isRedirect(thrown)).toBe(true)
  expect((thrown as { options: { to?: string } }).options.to).toBe("/runs")
})
