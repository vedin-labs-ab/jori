// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ActivityItem } from "../item"
import { type ActivityItem as ActivityItemType } from "../types"

afterEach(() => {
  cleanup()
})

test("keeps fetched web page metadata focused on URL and page count", () => {
  const pageTitle =
    "limited preview trusted partners government GPT-5.6 Sol announcement"

  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          metadata: [
            {
              kind: "target",
              text: "openai.com/index/previewing-gpt-5-6-sol",
            },
            { kind: "outcome", text: pageTitle },
            { kind: "outcome", text: "1 page" },
          ],
          title: "Fetch web page",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(
    screen.getByText("openai.com/index/previewing-gpt-5-6-sol")
  ).toBeDefined()
  expect(screen.getByText("1 page")).toBeDefined()
  expect(screen.queryByText(pageTitle)).toBeNull()
})

test("keeps web search metadata focused on query and result count", () => {
  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          metadata: [
            {
              kind: "target",
              text: "site:theverge.com OR site:techcrunch.com",
            },
            { kind: "scope", text: "in theverge.com, techcrunch.com" },
            { kind: "outcome", text: "3 results" },
          ],
          title: "Search web",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(
    screen.getByText("site:theverge.com OR site:techcrunch.com")
  ).toBeDefined()
  expect(screen.getByText("3 results")).toBeDefined()
  expect(
    screen.getByText("site:theverge.com OR site:techcrunch.com").parentElement
      ?.className
  ).not.toContain("basis-0")
  expect(screen.getByText("3 results").parentElement?.className).toContain(
    "shrink-0"
  )
  expect(screen.queryByText("in theverge.com, techcrunch.com")).toBeNull()
})

test("renders server-provided reaction labels without redundant outcomes", () => {
  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          metadata: [
            { kind: "target", text: "👍" },
            { kind: "outcome", text: "reaction added" },
          ],
          title: "Add reaction",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("👍")).toBeDefined()
  expect(screen.queryByText("reaction added")).toBeNull()
})

test("renders bash commands as inline code", () => {
  const command = "date -u +%Y-%m-%dT%H:%M:%SZ"

  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          metadata: [{ kind: "target", text: command }],
          title: "Run command",
          tool: "bash",
        })}
        now={1700000002000}
      />
    </TooltipProvider>
  )

  const code = screen.getByText(command)

  expect(code.tagName).toBe("CODE")
  expect(code.className).toContain("font-mono")
  expect(code.className).toContain("bg-muted")
})

function activityItem(
  overrides: Partial<ActivityItemType> = {}
): ActivityItemType {
  return {
    access: "read",
    description: "src/app.tsx",
    details: [{ label: "Path", value: "src/app.tsx" }],
    durationMs: 1200,
    endedAt: 1700000001200,
    id: "activity",
    kind: "tool",
    startedAt: 1700000000000,
    status: "completed",
    title: "Read file",
    ...overrides,
  }
}
