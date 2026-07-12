import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { canPrincipalUseIntegration } from "./resolve"

test("organization principals cannot use personal account integrations", () => {
  const organization = { kind: "organization" } as const

  expect(canPrincipalUseIntegration(organization, "gmail")).toBe(false)
  expect(canPrincipalUseIntegration(organization, "googleCalendar")).toBe(false)
  expect(canPrincipalUseIntegration(organization, "slack")).toBe(true)
  expect(canPrincipalUseIntegration(organization, "github")).toBe(true)
})

test("person principals can use personal and organization integrations", () => {
  const person = {
    kind: "person",
    personId: "person" as Id<"persons">,
  } as const

  expect(canPrincipalUseIntegration(person, "gmail")).toBe(true)
  expect(canPrincipalUseIntegration(person, "slack")).toBe(true)
})
