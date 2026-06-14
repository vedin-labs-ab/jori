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
          facts: [],
        }}
      />
    )

    expect(container.textContent).toBe("")
  })

  test("renders rich event source metadata", () => {
    render(
      <SourceLine
        source={{
          type: "automation",
          provider: { type: "github", label: "GitHub" },
          event: {
            type: "pull_request.review_comment.created",
            label: "Pull request review comment created",
          },
          target: {
            type: "pull_request",
            label: "#42 in vedin-labs/frontier",
          },
          facts: [{ type: "path", label: "src/app.ts" }],
        }}
      />
    )

    expect(screen.getByText("GitHub").className).toContain("font-medium")
    expect(
      screen.getByText("pull_request.review_comment.created").className
    ).toContain("font-mono")
    expect(screen.getByText("#42 in vedin-labs/frontier").className).toContain(
      "font-medium"
    )
    expect(screen.getByText("path")).toBeDefined()
    expect(screen.getByText("src/app.ts")).toBeDefined()
  })
})
