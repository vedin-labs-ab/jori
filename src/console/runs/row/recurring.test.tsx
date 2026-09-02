// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { makeExecution, renderExecutionRow, slackTools } from "../fixtures"

vi.mock("convex/react", () => ({
  useQuery: () => ({ items: [], status: "loaded" }),
}))

afterEach(() => {
  cleanup()
})

test("renders recurring job details", async () => {
  renderExecutionRow(
    makeExecution({
      trigger: "Scheduled",
      task: "Generate a team image.",
      title: "Daily image",
      source: {
        kind: { label: "recurring", type: "recurring" },
        type: "job",
        surface: "jori",
      },
      details: [
        { type: "schedule", label: "Daily at 09:00 UTC" },
        { type: "next", label: "Next", timestamp: 1700125200000 },
        {
          type: "tools",
          label: "Slack · Read 1 · Write 1",
          groups: [
            {
              type: "slack",
              label: "Slack",
              tools: slackTools(),
            },
          ],
        },
        { type: "web_search", label: "Allowed" },
      ],
    })
  )

  expect(screen.getByText("recurring")).toBeDefined()
  expect(screen.getByText("Daily at 09:00 UTC")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: /daily image/i }))

  await screen.findByText("Tools")

  expect(screen.getByText("Jori")).toBeDefined()
  expect(screen.getAllByText("Daily at 09:00 UTC").length).toBeGreaterThan(1)
  expect(screen.getByText("Schedule")).toBeDefined()
  expect(screen.queryByText("Occurrence")).toBeNull()
  expect(screen.getByText("Next")).toBeDefined()
  expect(screen.getByText("Tools")).toBeDefined()
  expect(screen.getByRole("button", { name: "Open Slack tools" })).toBeDefined()
  expect(screen.getByText("Read 1")).toBeDefined()
  expect(screen.getByText("Write 1")).toBeDefined()
  expect(screen.getByText("Web search")).toBeDefined()
  expect(screen.getByText("Allowed")).toBeDefined()
})
