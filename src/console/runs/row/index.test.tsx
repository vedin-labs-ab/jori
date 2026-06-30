// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ExecutionItem } from "../types"
import { ExecutionRow } from "./index"

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => ({ items: [], status: "loaded" }),
}))

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
})

afterEach(() => {
  cleanup()
})

describe("execution row task details", () => {
  test("renders the execution task", async () => {
    renderExecutionRow(
      execution({
        task: "Summarize the Notion launch plan.",
        title: "Notion test",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    await screen.findByText("Task")

    expect(screen.getAllByText("Task")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Copy Task" })).toBeDefined()
    expect(screen.getByText("Summarize the Notion launch plan.")).toBeDefined()
  })

  test("does not render the title as the task", async () => {
    renderExecutionRow(
      execution({
        task: "Use the Notion page context to update the team.",
        title: "Notion test",
      })
    )

    const titleCount = screen.getAllByText("Notion test").length

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    await screen.findByText("Use the Notion page context to update the team.")

    expect(
      screen.getByText("Use the Notion page context to update the team.")
    ).toBeDefined()
    expect(screen.getAllByText("Notion test")).toHaveLength(titleCount)
  })
})

describe("execution row message details", () => {
  test("renders message run task source without duplicate message detail", async () => {
    renderExecutionRow(
      execution({
        task: "Please summarize this thread.",
        title: "Please summarize this thread.",
        source: {
          type: "message",
          surface: "slack",
          url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=T123",
        },
        details: [
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
        ],
      })
    )

    fireEvent.click(
      screen.getByRole("button", { name: /please summarize this thread/i })
    )

    await screen.findByText("Tools")

    expect(screen.getAllByText("Slack").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Task")).toHaveLength(1)
    expect(screen.getByText("Tools")).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Open Slack tools" })
    ).toBeDefined()
    expect(screen.getByText("Read 1")).toBeDefined()
    expect(screen.getByText("Write 1")).toBeDefined()
    expect(screen.queryByText("Send message, Read channel history")).toBeNull()
    expect(screen.getByRole("button", { name: "Copy Task" })).toBeDefined()
    expect(
      screen.getByRole("link", { name: /source/i }).getAttribute("href")
    ).toBe(
      "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=T123"
    )
    expect(screen.queryByText("Message")).toBeNull()
  })
})

describe("execution row approval details", () => {
  test("does not render the approval request source link", async () => {
    renderExecutionRow(
      execution({
        approval: {
          decidedAt: 1700000001000,
          expiresAt: 1700001800000,
          id: "approval",
          surface: "slack",
          source: {
            label: "Request message",
            surface: "slack",
            url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=T123",
          },
          state: "approved",
          summary: "Send the requested Slack update.",
          tool: "conversations_add_message",
          toolLabel: "Send Slack message",
        },
        task: "Send a Slack update.",
        title: "Approval test",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /approval test/i }))

    await screen.findByText("Approval")

    expect(screen.getByText("Approval")).toBeDefined()
    expect(screen.getByText("Send the requested Slack update.")).toBeDefined()
    expect(screen.queryByText("Request message")).toBeNull()
  })
})

describe("execution row linked details", () => {
  test("renders execution details with links", async () => {
    renderExecutionRow(
      execution({
        task: "Review the issue comment.",
        title: "GitHub test",
        details: [
          {
            type: "repository",
            label: "vedin-labs/frontier",
            url: "https://github.com/vedin-labs/frontier",
          },
          {
            type: "comment",
            label: "Can you check this failure?",
            url: "https://github.com/vedin-labs/frontier/issues/12#comment",
          },
        ],
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /github test/i }))

    await screen.findByText("Repository")

    expect(screen.getByText("Repository")).toBeDefined()
    expect(screen.getByText("Comment")).toBeDefined()
    const repositoryLink = screen.getByRole("link", {
      name: /vedin-labs\/frontier/i,
    })
    const commentSourceLink = screen.getByRole("link", {
      name: /source/i,
    })
    const commentBody = screen.getByText("Can you check this failure?")

    expect(repositoryLink.getAttribute("href")).toBe(
      "https://github.com/vedin-labs/frontier"
    )
    expect(repositoryLink.closest(".bg-muted")).toBeNull()
    expect(repositoryLink.parentElement?.className).not.toContain("py-1.5")
    expect(commentSourceLink.getAttribute("href")).toBe(
      "https://github.com/vedin-labs/frontier/issues/12#comment"
    )
    expect(commentBody.closest(".bg-muted")).not.toBeNull()
  })
})

describe("execution row pull request details", () => {
  test("renders pull request details as a plain linked fact", async () => {
    renderExecutionRow(
      execution({
        task: "Review the pull request comment.",
        title: "GitHub PR test",
        details: [
          {
            type: "pull_request",
            label: "#42 Add execution metadata",
            url: "https://github.com/vedin-labs/frontier/pull/42",
          },
        ],
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /github pr test/i }))

    await screen.findByText("Pull request")

    expect(screen.getByText("Pull request")).toBeDefined()
    const pullRequestLink = screen.getByRole("link", {
      name: /#42 add execution metadata/i,
    })

    expect(pullRequestLink.getAttribute("href")).toBe(
      "https://github.com/vedin-labs/frontier/pull/42"
    )
    expect(pullRequestLink.closest(".bg-muted")).toBeNull()
    expect(pullRequestLink.parentElement?.className).not.toContain("py-1.5")
  })
})

function renderExecutionRow(item: ExecutionItem) {
  return render(
    <TooltipProvider>
      <ExecutionRow execution={item} now={1700000001000} tenantId="tenant" />
    </TooltipProvider>
  )
}

function execution(
  overrides: Pick<ExecutionItem, "task" | "title"> &
    Partial<Pick<ExecutionItem, "approval" | "details" | "offer" | "source">>
): ExecutionItem {
  const approval = overrides.approval ?? null
  const offer = overrides.offer ?? null

  return {
    approval,
    approvals: approval === null ? [] : [approval],
    createdAt: 1700000000000,
    details: overrides.details ?? [],
    durationMs: 1000,
    endedAt: 1700000001000,
    id: "execution",
    offer,
    offers: offer === null ? [] : [offer],
    searchableText: "",
    source: overrides.source ?? {
      type: "automation",
      surface: "slack",
    },
    status: "completed",
    task: overrides.task,
    title: overrides.title,
    trigger: "Slack event",
  }
}

function slackTools() {
  return [
    {
      access: "write" as const,
      description: "Post a Slack message.",
      label: "Send message",
      tool: "conversations_add_message",
    },
    {
      access: "read" as const,
      description: "Read Slack channel messages.",
      label: "Read channel history",
      tool: "conversations_history",
    },
  ]
}
