// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

describe("automation instructions references", () => {
  test("renders sigil-free pills whose icons carry the kind", async () => {
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

    expect(skill?.textContent).toBe("meeting-prep")
    expect(tool?.textContent).toBe("conversations_add_message")
    expect(skill?.querySelector("svg")).not.toBeNull()
  })

  test("removes a reference from its hover remove button", async () => {
    const field = renderInstructionsField({
      description: "Run /meeting-prep now.",
      surfaces: [],
    })

    const button = await screen.findByRole("button", {
      name: "Remove meeting-prep",
    })

    fireEvent.click(button)

    await waitFor(() => {
      expect(field.onValueChange).toHaveBeenLastCalledWith({
        description: "Run  now.",
        surfaces: [],
      })
    })
  })
})
