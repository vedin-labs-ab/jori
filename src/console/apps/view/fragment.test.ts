import { expect, test } from "vitest"
import { memberAppUrl } from "./fragment"

test("removes the share secret while preserving the app view", () => {
  expect(
    memberAppUrl({
      hash: "#share=secret&d=2026-07-13&m=event",
      pathname: "/apps/app",
      search: "?preview=1",
    })
  ).toBe("/apps/app?preview=1#d=2026-07-13&m=event")
})

test("removes an otherwise empty share fragment", () => {
  expect(
    memberAppUrl({
      hash: "#share=secret",
      pathname: "/apps/app",
      search: "",
    })
  ).toBe("/apps/app")
})

test("leaves regular app fragments alone", () => {
  expect(
    memberAppUrl({
      hash: "#d=2026-07-13",
      pathname: "/apps/app",
      search: "",
    })
  ).toBeNull()
})
