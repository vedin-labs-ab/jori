import { expect, test } from "vitest"
import { Route } from "./_workspace/chat/index"

function validate(search: Record<string, unknown>) {
  const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>
  ) => unknown

  return validateSearch(search)
}

test("the chat's context arrives as kind:id and reads as a message context", () => {
  expect(validate({ context: "table:collections_1" })).toEqual({
    context: { kind: "table", id: "collections_1" },
  })
  expect(validate({ context: "video:1" })).toEqual({})
  expect(validate({ context: 7 })).toEqual({})
  expect(validate({})).toEqual({})
})
