// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import {
  createAutomationInstructionDocument,
  serializeAutomationInstructionDocument,
} from "./document"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

describe("automation instructions document", () => {
  test("converts parsed integration mentions into inline badge nodes", () => {
    const document = createAutomationInstructionDocument({
      description: "Review @github and post to slack.",
      surfaces: [
        { provider: "github", tools: ["github_get_issue"] },
        { provider: "slack", tools: ["conversations_add_message"] },
      ],
    })

    expect(serializeAutomationInstructionDocument(document)).toEqual({
      description: "Review GitHub and post to Slack.",
      surfaces: [
        { provider: "github", tools: ["github_get_issue"] },
        { provider: "slack", tools: ["conversations_add_message"] },
      ],
    })
  })

  test("defaults new integrations to no selected tools", () => {
    const document = createAutomationInstructionDocument({
      description: "Send to Slack.",
      surfaces: [],
    })

    expect(serializeAutomationInstructionDocument(document).surfaces).toEqual([
      { provider: "slack", tools: [] },
    ])
  })
})

describe("automation instructions field layout", () => {
  test("aligns placeholder with the editable text", async () => {
    const field = renderInstructionsField({
      description: "",
      surfaces: [],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const placeholder = field.container.querySelector(".pointer-events-none")

    expect(placeholder?.className).toContain("top-[9px]")
    expect(placeholder?.className).toContain("left-[9px]")
    expect(placeholder?.className).toContain("right-[9px]")
    expect(placeholder?.className).toContain("text-sm/6")
    expect(placeholder?.className).toContain("md:text-xs/6")
  })

  test("constrains long unbroken text inside the editor", async () => {
    const field = renderInstructionsField({
      description: "Post to GitHub then qweqweqweqweqweqweqweqweqweqweqweqwe.",
      surfaces: [{ provider: "github", tools: ["github_get_issue"] }],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const editorFrame = field.container.querySelector(".relative > div")

    expect(field.container.firstElementChild?.className).toContain("min-w-0")
    expect(editorFrame?.className).toContain("min-w-0")
    expect(editorFrame?.className).toContain("[overflow-wrap:anywhere]")
  })

  test("keeps text rows stable when badges are present", async () => {
    const field = renderInstructionsField({
      description: "Post GitHub results to Slack.",
      surfaces: [
        { provider: "github", tools: ["github_get_issue"] },
        { provider: "slack", tools: ["conversations_add_message"] },
      ],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const editorFrame = field.container.querySelector(".relative > div")
    const badgeWrapper = field.container.querySelector(
      "[data-automation-surface-view]"
    )
    const buttonGroup = badgeWrapper?.querySelector(
      '[data-slot="button-group"]'
    )
    const removePane = buttonGroup?.querySelector(
      "[data-automation-remove-content]"
    )

    expect(editorFrame?.className).toContain("[&_.tiptap]:leading-6")
    expect(editorFrame?.className).toContain("[&_.tiptap>p]:min-h-6")
    expect(editorFrame?.className).toContain("[&_.tiptap>p]:leading-6")
    expect(badgeWrapper?.className).toContain("align-middle")
    expect(buttonGroup?.className).toContain("align-middle")
    expect(buttonGroup?.className).toContain("h-5")
    expect(buttonGroup?.className).toContain("text-[0.625rem]/none")
    expect(removePane?.className).toContain("px-1")
  })
})

describe("automation instructions marker divider", () => {
  test("uses a plain unrounded divider outside shadcn slot styling", async () => {
    const field = renderInstructionsField({
      description: "Post GitHub results to Slack.",
      surfaces: [{ provider: "github", tools: ["github_get_issue"] }],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()

    const separator = field.container.querySelector(
      "[data-automation-surface-separator]"
    )

    expect(separator?.className).toContain("self-stretch")
    expect(separator?.className).toContain("w-[0.5px]")
    expect(separator?.className).toContain("rounded-none")
    expect(separator?.className).not.toContain("data-vertical")
    expect(separator?.getAttribute("data-slot")).toBeNull()
  })
})

describe("automation instructions field footer", () => {
  test("shows marker guidance inside the editor frame", async () => {
    const field = renderInstructionsField({
      description: "",
      surfaces: [],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()
    expect(field.container.textContent).toContain(
      "Type integration names and matching badges appear automatically."
    )

    const footer = field.container.querySelector(
      "[data-automation-instructions-frame] > div:last-child"
    )

    expect(footer?.className).toContain("border-t")
    expect(footer?.className).toContain("bg-muted/30")
    expect(footer?.className).toContain("px-2")
    expect(footer?.className).not.toContain("mx-2")
  })
})

describe("automation instructions field", () => {
  test("renders integration badges inside the editor", async () => {
    renderInstructionsField({
      description: "Post to @github.",
      surfaces: [{ provider: "github", tools: ["github_add_issue_comment"] }],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()
    expect(
      await screen.findByRole("button", {
        name: "GitHub tools: 1 enabled. Configure tools.",
      })
    ).toBeDefined()
  })

  test("opens tool selection from the inline tool count", async () => {
    const field = renderInstructionsField({
      description: "Post to GitHub.",
      surfaces: [{ provider: "github", tools: ["github_get_issue"] }],
    })

    const button = await screen.findByRole("button", {
      name: "GitHub tools: 1 enabled. Configure tools.",
    })

    expect(fireEvent.mouseDown(button)).toBe(false)

    fireEvent.click(button)
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Add issue comment" })
    )

    await waitFor(() => {
      expect(field.onValueChange).toHaveBeenLastCalledWith({
        description: "Post to GitHub.",
        surfaces: [
          {
            provider: "github",
            tools: ["github_get_issue", "github_add_issue_comment"],
          },
        ],
      })
    })
  })

  test("removes a marker from its provider icon button", async () => {
    const field = renderInstructionsField({
      description: "Post to GitHub.",
      surfaces: [{ provider: "github", tools: ["github_get_issue"] }],
    })

    const button = await screen.findByRole("button", {
      name: "Remove GitHub",
    })

    expect(fireEvent.mouseDown(button)).toBe(false)

    fireEvent.click(button)

    await waitFor(() => {
      expect(field.onValueChange).toHaveBeenLastCalledWith({
        description: "Post to .",
        surfaces: [],
      })
    })
  })
})
