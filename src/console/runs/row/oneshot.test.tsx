// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ExecutionItem } from "../types"
import { ExecutionRow } from "./index"

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

describe("execution row one-shot details", () => {
  test("renders one-shot automation details", () => {
    renderExecutionRow(
      oneShotExecution({
        details: [slackToolsDetail(), { type: "web_search", label: "Allowed" }],
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /daily image/i }))

    expect(screen.getByText("Milo")).toBeDefined()
    expect(screen.queryByText("Scheduled")).toBeNull()
    expect(screen.queryByText("One-shot")).toBeNull()
    expect(screen.getByText("Tools")).toBeDefined()
    expect(
      screen.getByRole("button", { name: "Open Slack tools" })
    ).toBeDefined()
    expect(screen.getByText("Read 1")).toBeDefined()
    expect(screen.getByText("Write 1")).toBeDefined()
    expect(screen.queryByText("Send message, Read channel history")).toBeNull()
    expect(screen.getByText("Web search")).toBeDefined()
    expect(screen.getByText("Allowed")).toBeDefined()
  })

  test("opens read-only tool details", () => {
    renderExecutionRow(oneShotExecution({ details: [slackToolsDetail()] }))

    fireEvent.click(screen.getByRole("button", { name: /daily image/i }))
    fireEvent.click(screen.getByRole("button", { name: "Open Slack tools" }))

    const dialog = screen.getByRole("dialog")

    expect(dialog).toBeDefined()
    expect(screen.getByText("Slack tools")).toBeDefined()
    expect(screen.getByText("Read channel history")).toBeDefined()
    expect(screen.getByText("Read Slack channel messages.")).toBeDefined()
    expect(screen.getByText("Send message")).toBeDefined()
    expect(screen.getByText("Post a Slack message.")).toBeDefined()
    expect(within(dialog).getAllByText("Read")).toHaveLength(1)
    expect(within(dialog).getAllByText("Write")).toHaveLength(1)
    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.queryByRole("button", { name: /select all/i })).toBeNull()
  })
})

function renderExecutionRow(item: ExecutionItem) {
  return render(
    <TooltipProvider>
      <ExecutionRow execution={item} now={1700000001000} tenantId="tenant" />
    </TooltipProvider>
  )
}

function oneShotExecution({
  details,
}: {
  details: ExecutionItem["details"]
}): ExecutionItem {
  return {
    approval: null,
    createdAt: 1700000000000,
    details,
    durationMs: 1000,
    endedAt: 1700000001000,
    id: "execution",
    searchableText: "",
    source: {
      type: "automation",
      surface: "milo",
    },
    status: "completed",
    task: "Generate a team image.",
    title: "Daily image",
    trigger: "Time automation",
  }
}

function slackToolsDetail(): ExecutionItem["details"][number] {
  return {
    type: "tools",
    label: "Slack · Read 1 · Write 1",
    groups: [
      {
        type: "slack",
        label: "Slack",
        tools: slackTools(),
      },
    ],
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
