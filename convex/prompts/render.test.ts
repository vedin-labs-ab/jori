import { describe, expect, test } from "vitest"
import { renderPromptTemplate } from "./render"

describe("renderPromptTemplate", () => {
  test("renders values", () => {
    expect(
      renderPromptTemplate("Hello {{ user.name }}.", {
        user: { name: "Albin" },
      })
    ).toBe("Hello Albin.")
  })

  test("throws when required output values are missing", () => {
    expect(() => renderPromptTemplate("Hello {{ user.name }}.", {})).toThrow(
      "undefined variable: user"
    )
  })

  test("renders boolean conditionals", () => {
    expect(
      renderPromptTemplate("A{% if tools.send_reply %} B{% endif %} C", {
        tools: { send_reply: true },
      })
    ).toBe("A B C")
    expect(
      renderPromptTemplate("A{% if tools.send_reply %} B{% endif %} C", {
        tools: { send_reply: false },
      })
    ).toBe("A C")
  })

  test("renders string equality conditionals", () => {
    expect(
      renderPromptTemplate(
        '{% if surface.integration == "slack" %}Slack{% endif %}',
        {
          surface: { integration: "slack" },
        }
      )
    ).toBe("Slack")
  })

  test("renders includes from the prompt registry", () => {
    expect(
      renderPromptTemplate('{% include "parts/identity" %}', {})
    ).toContain("You are Milo")
  })
})
