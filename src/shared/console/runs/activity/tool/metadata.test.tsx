// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activityItem } from "../../../../../../test/activity"
import { ActivityItem } from "../item"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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

test("shows search query and result count without scope or generic descriptions", () => {
  render(
    <TooltipProvider>
      <ActivityItem
        item={activityItem({
          description: "Returned object (3).",
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
  expect(screen.queryByText("Returned object (3).")).toBeNull()
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

// A run's clock re-renders every row once a second, and reading overflow
// forces a synchronous layout. The line is measured when its text or its
// width changes, never because the clock moved.
test("does not re-measure overflow when only the clock changes", () => {
  const item = activityItem({
    metadata: [{ kind: "target", text: "src/console/runs/activity/item.tsx" }],
    title: "Read file",
  })
  const view = render(
    <TooltipProvider>
      <ActivityItem item={item} now={1700000002000} />
    </TooltipProvider>
  )

  const scrollWidth = vi.spyOn(Element.prototype, "scrollWidth", "get")

  view.rerender(
    <TooltipProvider>
      <ActivityItem item={item} now={1700000003000} />
    </TooltipProvider>
  )

  expect(scrollWidth).not.toHaveBeenCalled()
})
