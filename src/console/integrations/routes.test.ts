import { expect, test } from "vitest"
import { integrationsRouteFor } from "./routes"

test("routes personal-only integrations to the personal tab", () => {
  expect(integrationsRouteFor(["gmail", "googleCalendar"])).toBe(
    "/integrations/personal"
  )
})

test("routes organization-only integrations to the organization tab", () => {
  expect(integrationsRouteFor(["slack", "github"])).toBe("/integrations")
})

test("routes a mixed set to whichever scope has more left", () => {
  expect(integrationsRouteFor(["gmail", "googleCalendar", "slack"])).toBe(
    "/integrations/personal"
  )
  expect(integrationsRouteFor(["gmail", "slack", "github"])).toBe(
    "/integrations"
  )
})

test("falls back to the organization tab on a tie or an empty set", () => {
  expect(integrationsRouteFor(["gmail", "slack"])).toBe("/integrations")
  expect(integrationsRouteFor([])).toBe("/integrations")
})
