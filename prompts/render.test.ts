import { describe, expect, test } from "vitest"
import { renderPromptTemplate } from "./render"

describe("renderPromptTemplate", () => {
  test.each([
    [true, "slack", "Hello Albin. Reply in Slack."],
    [false, "console", "Hello Albin."],
  ])(
    "renders values and conditional sections for %s / %s",
    (sendReply, surface, expected) => {
      expect(
        renderPromptTemplate(
          'Hello {{ user.name }}.{% if tools.send_reply %} Reply{% endif %}{% if surface.integration == "slack" %} in Slack.{% endif %}',
          {
            user: { name: "Albin" },
            tools: { send_reply: sendReply },
            surface: { integration: surface },
          }
        )
      ).toBe(expected)
    }
  )

  test("throws when required output values are missing", () => {
    expect(() => renderPromptTemplate("Hello {{ user.name }}.", {})).toThrow(
      "undefined variable: user"
    )
  })

  test("collapses blank lines before and after fences, preserving those inside", () => {
    expect(
      renderPromptTemplate("A\n\n\nB\n```text\nC\n\n\nD\n```\n\n\nE", {})
    ).toBe("A\n\nB\n```text\nC\n\n\nD\n```\n\nE")
  })
})
