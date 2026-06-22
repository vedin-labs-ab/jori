import { expect, test } from "vitest"
import { parsePromptedToolApproval } from "./args"

test("extracts approval metadata and strips it from tool args", () => {
  const approval = parsePromptedToolApproval({
    surface: "notion",
    tool: "notion_create_page",
    args: {
      parent: { page_id: "page_1" },
      properties: {
        title: {
          title: [{ text: { content: "Random page" } }],
        },
      },
      approval: {
        summary: "Create a random Notion page.",
      },
    },
  })

  expect(approval.summary).toBe("Create a random Notion page.")
  expect(approval.args).toEqual({
    parent: { page_id: "page_1" },
    properties: {
      title: {
        title: [{ text: { content: "Random page" } }],
      },
    },
  })
})

test("requires approval metadata", () => {
  expect(() =>
    parsePromptedToolApproval({
      surface: "notion",
      tool: "notion_create_page",
      args: {},
    })
  ).toThrow("Include approval.summary")
})
