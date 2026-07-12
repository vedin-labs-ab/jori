import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import {
  executionPrincipalForScope,
  executionPrincipalPersonId,
  scopeForExecutionPrincipal,
} from "./principal"

test("maps audience scope to a matching execution principal", () => {
  const personId = "person" as Id<"persons">

  expect(executionPrincipalForScope("personal", personId)).toEqual({
    kind: "person",
    personId,
  })
  expect(executionPrincipalForScope("organization", personId)).toEqual({
    kind: "organization",
  })
  expect(() => executionPrincipalForScope("personal", undefined)).toThrow(
    "requires a person"
  )
})

test("only person principals resolve a person identity", () => {
  const personId = "person" as Id<"persons">
  const person = { kind: "person", personId } as const
  const organization = { kind: "organization" } as const

  expect(executionPrincipalPersonId(person)).toBe(personId)
  expect(executionPrincipalPersonId(organization)).toBeUndefined()
  expect(scopeForExecutionPrincipal(person)).toBe("personal")
  expect(scopeForExecutionPrincipal(organization)).toBe("organization")
})
