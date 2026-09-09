// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

describe("job instructions marker validation", () => {
  test("shows marker validation below the editor", async () => {
    renderInstructionsField({
      description: "Post a message.",
      error: "Mention at least one integration in the instructions.",
      surfaces: [],
    })

    const textbox = await screen.findByRole("textbox")
    const error = screen.getByText(
      "Mention at least one integration in the instructions."
    )

    expect(textbox.getAttribute("aria-describedby")).toBe("instructions-error")
    expect(textbox.getAttribute("aria-invalid")).toBe("true")
    expect(error.getAttribute("id")).toBe("instructions-error")
    expect(error.getAttribute("role")).toBe("alert")
  })

  test("targets unselected markers with destructive validation", async () => {
    const field = renderInstructionsField({
      description: "Post to @GitHub.",
      error: "Choose at least one tool for each mentioned integration.",
      showAccessError: true,
      surfaces: [{ integration: "github", tools: [] }],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const editorFrame = field.container.querySelector(
      "[data-job-instructions-frame]"
    )
    const buttonGroup = field.container.querySelector(
      '[data-slot="button-group"]'
    )

    expect(editorFrame?.getAttribute("data-access-error")).toBe("true")
    expect(editorFrame?.className).toContain("[data-job-surface-access=unset]")
    expect(buttonGroup?.getAttribute("data-job-surface-access")).toBe("unset")
  })
})
