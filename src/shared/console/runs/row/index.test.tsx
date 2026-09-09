// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { makeApproval, makeExecution, slackToolsDetail } from "../fixtures"
import { renderExecutionRow } from "./harness"

afterEach(() => {
  cleanup()
})

describe("execution row task details", () => {
  test("renders the task once without repeating the execution title", async () => {
    renderExecutionRow(
      makeExecution({
        task: "Summarize the Notion launch plan.",
        title: "Notion test",
      })
    )

    const titleCount = screen.getAllByText("Notion test").length

    fireEvent.click(screen.getByRole("button", { name: /notion test/i }))

    await screen.findByText("Summarize the Notion launch plan.")

    expect(screen.getAllByText("Task")).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Copy Task" })).toBeDefined()
    expect(screen.getAllByText("Notion test")).toHaveLength(titleCount)
  })
})

describe("execution row message details", () => {
  test("renders message run task source without duplicate message detail", async () => {
    renderExecutionRow(
      makeExecution({
        task: "Please summarize this thread.",
        title: "Please summarize this thread.",
        source: {
          type: "message",
          surface: "slack",
          url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=T123",
        },
        details: [slackToolsDetail()],
      })
    )

    fireEvent.click(
      screen.getByRole("button", { name: /please summarize this thread/i })
    )

    await screen.findByText("Tools")

    expect(screen.getAllByText("Slack").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Task")).toHaveLength(1)
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
      makeExecution({
        approval: makeApproval({
          source: {
            label: "Request message",
            integration: "slack",
            url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=T123",
          },
        }),
        task: "Send a Slack update.",
        title: "Approval test",
      })
    )

    fireEvent.click(screen.getByRole("button", { name: /approval test/i }))

    await screen.findByText("Approval")

    expect(screen.getByText("Send the requested Slack update.")).toBeDefined()
    expect(screen.queryByText("Request message")).toBeNull()
  })
})

describe("execution row linked details", () => {
  test("renders execution details with links", async () => {
    renderExecutionRow(
      makeExecution({
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

    expect(screen.getByText("Comment")).toBeDefined()
    const repositoryLink = screen.getByRole("link", {
      name: /vedin-labs\/frontier/i,
    })
    const commentSourceLink = screen.getByRole("link", {
      name: /source/i,
    })
    expect(screen.getByText("Can you check this failure?")).toBeDefined()

    expect(repositoryLink.getAttribute("href")).toBe(
      "https://github.com/vedin-labs/frontier"
    )
    expect(commentSourceLink.getAttribute("href")).toBe(
      "https://github.com/vedin-labs/frontier/issues/12#comment"
    )
  })
})

describe("execution row pull request details", () => {
  test("renders pull request details with their source link", async () => {
    renderExecutionRow(
      makeExecution({
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

    const pullRequestLink = screen.getByRole("link", {
      name: /#42 add execution metadata/i,
    })

    expect(pullRequestLink.getAttribute("href")).toBe(
      "https://github.com/vedin-labs/frontier/pull/42"
    )
  })
})
