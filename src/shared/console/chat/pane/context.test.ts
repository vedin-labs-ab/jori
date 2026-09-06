import { expect, test } from "vitest"
import { contextSearch, parseContextSearch } from "./context"

test("a context round-trips through the search", () => {
  const search = contextSearch({ kind: "table", id: "collections_renewals" })

  expect(search).toEqual({ context: "table:collections_renewals" })
  expect(parseContextSearch(search.context)).toEqual({
    kind: "table",
    id: "collections_renewals",
  })
})

test("an id may itself carry a colon", () => {
  expect(parseContextSearch("job:a:b")).toEqual({ kind: "job", id: "a:b" })
})

test("anything that is not a known kind and an id reads as no context", () => {
  expect(parseContextSearch(undefined)).toBeUndefined()
  expect(parseContextSearch("table")).toBeUndefined()
  expect(parseContextSearch("table:")).toBeUndefined()
  expect(parseContextSearch("widget:1")).toBeUndefined()
})
