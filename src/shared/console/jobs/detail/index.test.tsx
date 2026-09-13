// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type Job } from "../types"
import { JobDetail } from "."

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../../test/router")).Link,
}))

afterEach(cleanup)

const now = 1_700_000_000_000
const day = 86_400_000

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    ownerId: "person-1",
    ownerName: "Ada Lovelace",
    ownerImage: undefined,
    key: undefined,
    name: "Weekly digest",
    instructions: "Review GitHub and post to Slack.",
    audience: "organization",
    visibility: { mode: "teams", teamIds: ["team-1"] },
    type: "cron",
    status: "active",
    folderId: "folder-1",
    trigger: { expression: "0 9 * * *", timezone: "UTC", nextAt: now + day },
    access: {
      webSearch: false,
      surfaces: [
        {
          integration: "slack",
          access: "write",
          tools: ["conversations_add_message"],
        },
      ],
    },
    createdAt: now - 3 * day,
    updatedAt: now - day,
    firedAt: now - day,
    ...overrides,
  } as Job
}

const folders = new Map([
  ["folder-1", { name: "Renewals", parentId: undefined }],
])

test("reads like a run's opened detail: brief, trigger, access, filing", () => {
  render(
    <TooltipProvider>
      <JobDetail
        folders={folders}
        instructions={<p>The brief.</p>}
        job={job()}
        now={now}
        runs={<p>The runs.</p>}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Instructions")).toBeDefined()
  expect(screen.getByText("The brief.")).toBeDefined()
  expect(screen.getByText("Daily")).toBeDefined()
  expect(screen.getByText("09:00 UTC")).toBeDefined()
  expect(screen.getByText("Next in 1d")).toBeDefined()
  expect(screen.getByText("Tool")).toBeDefined()
  expect(screen.getByRole("button", { name: "Open Slack tools" })).toBeDefined()
  expect(screen.getByText("Blocked")).toBeDefined()
  expect(screen.getByRole("link", { name: "Renewals" })).toBeDefined()
  expect(screen.getByText("1 team")).toBeDefined()
  expect(screen.getByText("Ada Lovelace")).toBeDefined()
  expect(screen.getByRole("heading", { name: "Runs" })).toBeDefined()
  expect(screen.getByText("The runs.")).toBeDefined()
})

test("a paused job says so where its next run would be", () => {
  render(
    <TooltipProvider>
      <JobDetail
        folders={folders}
        instructions={null}
        job={job({
          status: "paused",
          access: { webSearch: true, surfaces: [] },
        })}
        now={now}
        runs={null}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Paused")).toBeDefined()
  expect(screen.queryByText(/^Next /)).toBeNull()
  expect(screen.getByText("No tools")).toBeDefined()
  expect(screen.getByText("Allowed")).toBeDefined()
})
