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

describe("job instructions shared tool access document", () => {
  test("uses one shared surface for duplicate integration mentions", () => {
    const document = createJobInstructionDocument({
      catalog: emptyJobMentionCatalog,
      description: "Read @GitHub and update @GitHub.",
      surfaces: [
        {
          integration: "github",
          tools: ["github_get_issue", "github_add_issue_comment"],
        },
      ],
    })

    expect(serializeJobInstructionDocument(document)).toEqual({
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

describe("job instructions tool access", () => {
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

test.each([
  { tools: [], title: "No tools", count: "No tools enabled" },
  { tools: ["github_get_issue"], title: "Read: 1 enabled", count: "1 enabled" },
  {
    tools: ["github_add_issue_comment"],
    title: "Write: 1 enabled",
    count: "1 enabled",
  },
  {
    tools: ["github_get_issue", "github_add_issue_comment"],
    title: "Read/write: 2 enabled",
    count: "2 enabled",
  },
])("names the selected tool access as $title", async ({
  tools,
  title,
  count,
}) => {
  renderInstructionsField({
    description: "Post to @GitHub.",
    surfaces: [{ integration: "github", tools }],
  })

  const button = await screen.findByRole("button", {
    name: `GitHub tools: ${count}. Configure tools.`,
  })

  expect(button.getAttribute("title")).toBe(title)
  expect(button.textContent?.trim()).toBe(
    tools.length === 0 ? "" : `${tools.length}`
  )
})

test("warns when policy denies access to a selected tool", async () => {
  const field = renderInstructionsField({
    description: "Post to @GitHub.",
    permissions: [
      toolPermission(
        "github",
        "github_get_issue",
        "Read issue",
        "read",
        "blocked"
      ),
    ],
    policyKey: "github-read-blocked",
    surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
  })

  const button = await screen.findByRole("button", {
    name: "GitHub tools: 1 enabled, some unavailable. Configure tools.",
  })

  expect(button.className).toContain("text-destructive")
  expect(
    field.container.querySelector('[data-job-surface-policy="blocked"]')
  ).not.toBeNull()
})
