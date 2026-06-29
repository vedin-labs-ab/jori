import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { selectSurvivor } from "./rows"

const person = (id: string) => id as Id<"persons">

test("selectSurvivor picks the person with the strongest link method", () => {
  expect(
    selectSurvivor([
      { personId: person("observed"), method: "observed" },
      { personId: person("oauth"), method: "oauth" },
      { personId: person("email"), method: "email" },
    ])
  ).toBe(person("oauth"))
})

test("selectSurvivor never lets observation supersede a proven identity", () => {
  expect(
    selectSurvivor([
      { personId: person("proven"), method: "oauth" },
      { personId: person("seen"), method: "observed" },
    ])
  ).toBe(person("proven"))
})

test("selectSurvivor keeps the first candidate on a precedence tie", () => {
  expect(
    selectSurvivor([
      { personId: person("first"), method: "oauth" },
      { personId: person("second"), method: "oauth" },
    ])
  ).toBe(person("first"))
})

test("selectSurvivor returns undefined without candidates", () => {
  expect(selectSurvivor([])).toBeUndefined()
})
