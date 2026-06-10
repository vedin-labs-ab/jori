import { expect, test } from "vitest"
import { parsePromptedToolApproval } from "./approvalArgs"

test("extracts approval metadata and strips it from tool args", () => {
  const approval = parsePromptedToolApproval({
    provider: "notion",
    tool: "notion_create_page",
    args: {
      parent: { type: "workspace" },
      title: "Random page",
      approval: {
        summary: "Create a random Notion page.",
        handoff: {
          objective: "Create the page and confirm it in Slack.",
          progress: "The user asked for a random page at the root.",
          next: "Reply with the created page link.",
        },
      },
    },
  })

  expect(approval.summary).toBe("Create a random Notion page.")
  expect(approval.args).toEqual({
    parent: { type: "workspace" },
    title: "Random page",
  })
})

test("requires approval metadata", () => {
  expect(() =>
    parsePromptedToolApproval({
      provider: "notion",
      tool: "notion_create_page",
      args: {},
    })
  ).toThrow("Include approval summary and handoff")
})
