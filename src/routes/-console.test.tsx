import { isRedirect } from "@tanstack/react-router"
import { expect, test } from "vitest"
import { Route } from "./console"

function caughtBeforeLoad() {
  try {
    Route.options.beforeLoad?.({ search: {} } as never)
  } catch (error) {
    return error
  }

  return undefined
}

test("the console entry path forwards to the chat", () => {
  const thrown = caughtBeforeLoad()

  expect(isRedirect(thrown)).toBe(true)
  expect((thrown as { options: unknown }).options).toMatchObject({
    to: "/chat",
    search: {},
    replace: true,
  })
})
