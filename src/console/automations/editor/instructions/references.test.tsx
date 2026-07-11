// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

describe("automation instructions references", () => {
  test("renders skill and tool mentions as kind-marked pills", async () => {
    const field = renderInstructionsField({
      description: "Run /meeting-prep then #conversations_add_message now.",
      surfaces: [],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const skill = field.container.querySelector(
      '[data-automation-reference-kind="skill"]'
    )
    const tool = field.container.querySelector(
      '[data-automation-reference-kind="tool"]'
    )

    expect(skill?.textContent).toBe("/meeting-prep")
    expect(tool?.textContent).toBe("#conversations_add_message")
  })
})
