// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { emptyJobMentionCatalog } from "../../access"
import {
  createJobInstructionDocument,
  serializeJobInstructionDocument,
} from "./document"
import { renderInstructionsField, toolPermission } from "./fixtures"

afterEach(cleanup)

describe("job instructions document", () => {
  test("converts parsed integration mentions into inline badge nodes", () => {
    const document = createJobInstructionDocument({
      catalog: emptyJobMentionCatalog,
      description: "Review @github with @jori and post to @slack.",
      surfaces: [
        { integration: "github", tools: ["github_get_issue"] },
        { integration: "jori", tools: ["read_table"] },
        { integration: "slack", tools: ["conversations_add_message"] },
      ],
    })

    expect(serializeJobInstructionDocument(document)).toEqual({
      description: "Review @GitHub with @Jori and post to @Slack.",
      surfaces: [
        { integration: "github", tools: ["github_get_issue"] },
        { integration: "jori", tools: ["read_table"] },
        { integration: "slack", tools: ["conversations_add_message"] },
      ],
    })
  })

  test("defaults new integrations to selectable tools", () => {
    const document = createJobInstructionDocument({
      catalog: emptyJobMentionCatalog,
      description: "Send to @Slack.",
      permissions: [
        toolPermission(
          "slack",
          "conversations_history",
          "Read history",
          "read"
        ),
        toolPermission(
          "slack",
          "conversations_add_message",
          "Send message",
          "write",
          "required"
        ),
        toolPermission(
          "slack",
          "conversations_request_approval",
          "Request approval",
          "write",
          "prompted"
        ),
        toolPermission(
          "slack",
          "conversations_delete_message",
          "Delete message",
          "write",
          "blocked"
        ),
      ],
      surfaces: [],
    })

    expect(serializeJobInstructionDocument(document).surfaces).toEqual([
      {
        integration: "slack",
        tools: ["conversations_history", "conversations_add_message"],
      },
    ])
  })
})

describe("job instructions field footer", () => {
  test("shows marker guidance inside the editor frame", async () => {
    const field = renderInstructionsField({
      description: "",
      surfaces: [],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()
    expect(field.container.textContent).toContain("access")
    expect(field.container.textContent).toContain("skills")
    expect(field.container.textContent).toContain("tools")
    expect(field.container.textContent).not.toContain("read/write")
  })
})

describe("job instructions field", () => {
  test("renders a normalized integration badge and opens its tool selection", async () => {
    const field = renderInstructionsField({
      description: "Post to @github.",
      surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
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
        description: "Post to @GitHub.",
        surfaces: [
          {
            integration: "github",
            tools: ["github_get_issue", "github_add_issue_comment"],
          },
        ],
      })
    })
  })

  test("removes a marker from its integration icon button", async () => {
    const field = renderInstructionsField({
      description: "Post to @GitHub.",
      surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
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

describe("job instructions tool dialog", () => {
  test("selects all selectable tools in a tool group", async () => {
    const field = renderInstructionsField({
      description: "Post to @GitHub.",
      surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
    })

    fireEvent.click(
      await screen.findByRole("button", {
        name: "GitHub tools: 1 enabled. Configure tools.",
      })
    )
    fireEvent.click(
      await screen.findByRole("button", { name: "Select all write tools" })
    )

    await waitFor(() => {
      expect(field.onValueChange).toHaveBeenLastCalledWith({
        description: "Post to @GitHub.",
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
