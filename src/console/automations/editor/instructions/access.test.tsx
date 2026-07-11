// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { emptyAutomationMentionCatalog } from "../../access"
import {
  createAutomationInstructionDocument,
  serializeAutomationInstructionDocument,
} from "./document"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

describe("automation instructions shared tool access document", () => {
  test("uses one shared surface for duplicate integration mentions", () => {
    const document = createAutomationInstructionDocument({
      catalog: emptyAutomationMentionCatalog,
      description: "Read @GitHub and update @GitHub.",
      surfaces: [
        {
          integration: "github",
          tools: ["github_get_issue", "github_add_issue_comment"],
        },
      ],
    })

    expect(serializeAutomationInstructionDocument(document)).toEqual({
      description: "Read @GitHub and update @GitHub.",
      surfaces: [
        {
          integration: "github",
          tools: ["github_get_issue", "github_add_issue_comment"],
        },
      ],
    })
  })
})

describe("automation instructions tool access", () => {
  test("keeps the footer focused on smart integration mentions", async () => {
    const field = renderInstructionsField({
      description: "",
      surfaces: [],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()
    expect(field.container.textContent).toContain("integrations")
    expect(field.container.textContent).not.toContain("read/write")
  })

  test("hides the visible count for markers without enabled tools", async () => {
    renderInstructionsField({
      description: "Post to @GitHub.",
      surfaces: [{ integration: "github", tools: [] }],
    })

    const button = await screen.findByRole("button", {
      name: "GitHub tools: No tools enabled. Configure tools.",
    })

    expect(button.textContent?.trim()).toBe("")
  })

  test("keeps duplicate integration badges in sync", async () => {
    const field = renderInstructionsField({
      description: "Read @GitHub and post to @GitHub.",
      surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
    })

    const accessButtons = await screen.findAllByRole("button", {
      name: "GitHub tools: 1 enabled. Configure tools.",
    })

    expect(accessButtons).toHaveLength(2)

    fireEvent.click(accessButtons[0])
    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Add issue comment" })
    )

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", {
          hidden: true,
          name: "GitHub tools: 2 enabled. Configure tools.",
        })
      ).toHaveLength(2)
      expect(field.onValueChange).toHaveBeenLastCalledWith({
        description: "Read @GitHub and post to @GitHub.",
        surfaces: [
          {
            integration: "github",
            tools: ["github_get_issue", "github_add_issue_comment"],
          },
        ],
      })
    })
  })
})
