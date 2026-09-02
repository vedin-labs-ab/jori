// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { makeExecution, slackToolsDetail } from "@/shared/console/runs/fixtures"
import { type ExecutionItem } from "@/shared/console/runs/types"
import { renderExecutionRow } from "../fixtures"

vi.mock("convex/react", () => ({
  useQuery: () => ({ items: [], status: "loaded" }),
}))

afterEach(() => {
  cleanup()
})

describe("execution row one-shot details", () => {
  test("renders one-shot job details", async () => {
    renderExecutionRow(
      oneShotExecution({
        details: [slackToolsDetail(), { type: "web_search", label: "Allowed" }],
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /daily image/i }))

    await screen.findByText("Tools")

    expect(screen.getByText("Jori")).toBeDefined()
    // The row builds its chips from the source and the details, never from
    // the trigger label, and a source without a kind has no cadence to show.
    expect(screen.queryByText("Scheduled")).toBeNull()
    expect(screen.queryByText("one-shot")).toBeNull()
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

  test("opens read-only tool details", async () => {
    renderExecutionRow(oneShotExecution({ details: [slackToolsDetail()] }))

    fireEvent.click(screen.getByRole("button", { name: /daily image/i }))
    fireEvent.click(
      await screen.findByRole("button", { name: "Open Slack tools" })
    )

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

function oneShotExecution({ details }: Pick<ExecutionItem, "details">) {
  return makeExecution({
    details,
    source: { type: "job", surface: "jori" },
    task: "Generate a team image.",
    title: "Daily image",
    trigger: "Scheduled",
  })
}
