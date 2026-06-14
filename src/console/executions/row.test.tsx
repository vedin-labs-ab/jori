// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ExecutionRow } from "./row"
import { type ExecutionItem } from "./types"

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
  test("renders the execution task", () => {
    renderExecutionRow(
      execution({
        task: "Summarize the Notion launch plan.",
        title: "Notion test",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(screen.getAllByText("Task")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Copy Task" })).toBeDefined()
    expect(screen.getByText("Summarize the Notion launch plan.")).toBeDefined()
  })

  test("renders message run task source without duplicate message detail", () => {
    renderExecutionRow(
      execution({
        task: "Please summarize this thread.",
        title: "Please summarize this thread.",
        source: {
          type: "message",
          kind: { type: "mention", label: "mention" },
          provider: { type: "slack", label: "Slack" },
          metadata: [{ type: "channel", label: "#product" }],
        },
        taskSource: {
          label: "Source",
          url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=T123",
        },
      })
    )

    fireEvent.click(
      screen.getByRole("button", { name: /please summarize this thread/i })
    )

    expect(screen.getByText("mention")).toBeDefined()
    expect(screen.getAllByText("Task")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Copy Task" })).toBeDefined()
    expect(
      screen.getByRole("link", { name: /source/i }).getAttribute("href")
    ).toBe(
      "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=T123"
    )
    expect(screen.queryByText("Message")).toBeNull()
  })

  test("does not render the title as the task", () => {
    renderExecutionRow(
      execution({
        task: "Use the Notion page context to update the team.",
        title: "Notion test",
      })
    )

    const titleCount = screen.getAllByText("Notion test").length

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    expect(
      screen.getByText("Use the Notion page context to update the team.")
    ).toBeDefined()
    expect(screen.getAllByText("Notion test")).toHaveLength(titleCount)
  })
})

describe("execution row one-shot details", () => {
  test("renders one-shot automation details", () => {
    renderExecutionRow(
      execution({
        task: "Generate a team image.",
        title: "Daily image",
        source: {
          type: "automation",
          provider: { type: "milo", label: "Milo" },
          kind: { type: "one-shot", label: "one-shot" },
          metadata: [],
        },
        details: [
          {
            type: "tools",
            label: "Slack · Send message, Read channel history",
            groups: [
              {
                type: "slack",
                label: "Slack",
                values: ["Send message", "Read channel history"],
              },
            ],
          },
          { type: "web_search", label: "Allowed" },
        ],
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /daily image/i }))

    expect(screen.getByText("Milo")).toBeDefined()
    expect(screen.getByText("one-shot")).toBeDefined()
    expect(screen.queryByText("Scheduled")).toBeNull()
    expect(screen.queryByText("One-shot")).toBeNull()
    expect(screen.getByText("Tools")).toBeDefined()
    expect(screen.getByText("Slack")).toBeDefined()
    expect(screen.getByText("Send message, Read channel history")).toBeDefined()
    expect(
      screen.queryByText("Slack: Send message, Read channel history")
    ).toBeNull()
    expect(screen.getByText("Web search")).toBeDefined()
    expect(screen.getByText("Allowed")).toBeDefined()
  })
})

describe("execution row linked details", () => {
  test("renders execution details with links", () => {
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
  test("renders pull request details as a plain linked fact", () => {
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
    Partial<Pick<ExecutionItem, "details" | "source" | "taskSource">>
): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    details: overrides.details ?? [],
    durationMs: 1000,
    finishedAt: 1700000001000,
    id: "execution",
    searchableText: "",
    source: overrides.source ?? {
      type: "automation",
      provider: { type: "slack", label: "Slack" },
      event: { type: "message.created", label: "New channel message" },
      metadata: [],
    },
    status: "completed",
    task: overrides.task,
    taskSource: overrides.taskSource,
    title: overrides.title,
    trigger: "Slack event",
  }
}
