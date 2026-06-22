import { describe, expect, test } from "vitest"
import { renderPromptTemplate } from "./render"

describe("renderPromptTemplate", () => {
  test("renders required values", () => {
    expect(
      renderPromptTemplate("Hello {{user.name}}.", {
        user: { name: "Albin" },
      })
    ).toBe("Hello Albin.")
  })

  test("throws when required values are missing", () => {
    expect(() => renderPromptTemplate("Hello {{user.name}}.", {})).toThrow(
      "Missing prompt template value: user.name"
    )
  })

  test("omits optional values when missing or empty", () => {
    expect(renderPromptTemplate('A{{? missing prefix=" B"}} C', {})).toBe("A C")
    expect(
      renderPromptTemplate('A{{? value prefix=" B"}} C', { value: " " })
    ).toBe("A C")
  })

  test("adds optional prefixes and suffixes only for present values", () => {
    expect(
      renderPromptTemplate('A{{? value prefix="\\n" suffix="!"}}', {
        value: "B",
      })
    ).toBe("A\nB!")
  })

  test("supports prefixes and suffixes on required values", () => {
    expect(
      renderPromptTemplate('{{value prefix="[" suffix="]"}}', {
        value: "A",
      })
    ).toBe("[A]")
  })
})
