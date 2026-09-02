// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { makeApproval, makeExecution } from "../fixtures"
import { renderExecutionRow } from "../row/harness"
import { type ExecutionApproval } from "../types"

afterEach(() => {
  cleanup()
})

test("pages through multiple approval requests", async () => {
  const firstApproval = makeApproval({
    id: "approval-1" as ExecutionApproval["id"],
    summary: "Send the requested Slack update.",
    toolLabel: "Send Slack message",
  })
  const secondApproval = makeApproval({
    id: "approval-2" as ExecutionApproval["id"],
    summary: "Create the requested Notion page.",
    toolLabel: "Create Notion page",
  })

  renderExecutionRow(
    makeExecution({
      approvals: [firstApproval, secondApproval],
      task: "Handle the requested actions.",
      title: "Approval test",
    })
  )

  fireEvent.click(screen.getByRole("button", { name: /approval test/i }))

  await screen.findByText("Send the requested Slack update.")

  const count = screen.getByText("2")

  expect(screen.getByText("Approvals")).toBeDefined()
  expect(count.className).toContain("font-normal")
  expect(count.className).toContain("text-[0.625rem]")
  expect(count.className).toContain("text-muted-foreground")

  fireEvent.click(screen.getByRole("button", { name: "Next approval" }))

  expect(screen.getByText("Create the requested Notion page.")).toBeDefined()
  expect(screen.queryByText("Send the requested Slack update.")).toBeNull()
})
