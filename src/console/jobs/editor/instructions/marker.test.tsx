// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

describe("job instructions marker validation", () => {
  test("shows marker validation below the editor", async () => {
    const field = renderInstructionsField({
      description: "Post a message.",
      error: "Mention at least one integration in the instructions.",
      surfaces: [],
    })

    const textbox = await screen.findByRole("textbox")
    const editorFrame = field.container.querySelector(
      "[data-job-instructions-frame]"
    )
    const error = screen.getByText(
      "Mention at least one integration in the instructions."
    )

    expect(editorFrame?.className).toContain("border-destructive")
    expect(editorFrame?.className).toContain("ring-destructive/20")
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

describe("job instructions marker styling", () => {
  test("uses icon opacity instead of background for badge access hover", async () => {
    renderInstructionsField({
      description: "Post to @GitHub.",
      surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
    })

    const button = await screen.findByRole("button", {
      name: "GitHub tools: 1 enabled. Configure tools.",
    })

    expect(button.className).toContain("text-[#2563EB]")
    expect(button.className).toContain("px-1")
    expect(button.className).not.toContain("w-5")
    expect(button.className).toContain("opacity-70")
    expect(button.className).toContain("hover:opacity-100")
    expect(button.className).not.toContain("hover:bg-")
  })
})

describe("job instructions marker hover", () => {
  test("keeps integration pane width stable and only swaps the icon affordance", async () => {
    renderInstructionsField({
      description: "Post to @Notion.",
      surfaces: [{ integration: "notion", tools: ["notion_get_page"] }],
    })

    const button = await screen.findByRole("button", {
      name: "Remove Notion",
    })
    const content = button.closest("[data-job-remove-content]")
    const icon = button.querySelector("svg")

    expect(button.className).not.toContain("transition-[width]")
    expect(content?.textContent).toBe("Notion")
    expect(icon?.className.baseVal).toContain("opacity-55")
    expect(icon?.className.baseVal).toContain("group-hover/x:opacity-100")

    fireEvent.mouseEnter(button)

    expect(content?.textContent).toBe("Notion")

    fireEvent.mouseLeave(button)

    expect(content?.textContent).toBe("Notion")
  })
})
