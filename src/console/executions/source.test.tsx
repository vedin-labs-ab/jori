// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { SourceLine } from "./source"

afterEach(cleanup)

describe("execution source line", () => {
  test("renders nothing for automation-only sources", () => {
    const { container } = render(
      <SourceLine
        source={{
          type: "automation",
          metadata: [],
        }}
      />
    )

    expect(container.textContent).toBe("")
  })

  test("renders rich event source metadata", () => {
    const { container } = render(
      <SourceLine
        source={{
          type: "automation",
          provider: { type: "github", label: "GitHub" },
          event: {
            type: "pull_request.review_comment.created",
            label: "Pull request review comment created",
          },
          metadata: [
            { type: "repository", label: "vedin-labs/frontier" },
            { type: "pull_request", label: "#42 Add execution metadata" },
          ],
        }}
      />
    )

    expect(screen.getByText("GitHub").className).toContain("font-medium")
    expect(
      screen.getByText("pull_request.review_comment.created").className
    ).toContain("font-mono")
    expect(screen.getByText("frontier")).toBeDefined()
    expect(container.querySelector("svg[aria-hidden='true']")).toBeDefined()
    expect(container.querySelector("kbd")?.textContent).toBe("#42")
  })

  test("renders Slack channels as channel tokens", () => {
    render(
      <SourceLine
        source={{
          type: "message",
          provider: { type: "slack", label: "Slack" },
          metadata: [{ type: "channel", label: "#product" }],
        }}
      />
    )

    expect(screen.getByText("#")).toBeDefined()
    expect(screen.getByText("product").className).toContain("truncate")
  })
})
