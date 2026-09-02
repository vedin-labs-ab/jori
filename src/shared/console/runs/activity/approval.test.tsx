// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ActivityItem } from "./item"
import { type ActivityItem as ActivityItemType } from "./types"

afterEach(() => {
  cleanup()
})

test("renders approval descriptions as provider action identity", () => {
  const summary = "Create a Notion page with the requested content."

  render(
    <TooltipProvider>
      <ActivityItem
        item={approvalItem({ description: summary })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Approval expired")).toBeDefined()
  expect(screen.getByText("Create Notion page")).toBeDefined()
  expect(screen.queryByText(summary)).toBeNull()
  expect(
    document.querySelector('img[src="/logos/integrations/notion.svg"]')
  ).toBeDefined()
})

function approvalItem(
  overrides: Partial<ActivityItemType> = {}
): ActivityItemType {
  return {
    description: "Create a Notion page with the requested content.",
    details: [{ label: "Tool", value: "notion_create_page" }],
    durationMs: 1000,
    endedAt: 1700000001000,
    id: "approval",
    kind: "approval",
    startedAt: 1700000000000,
    status: "expired",
    surface: "notion",
    title: "Approval expired",
    toolLabel: "Create Notion page",
    ...overrides,
  }
}
