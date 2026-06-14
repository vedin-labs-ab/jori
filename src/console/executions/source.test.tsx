// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { SourceLine } from "./source"

afterEach(cleanup)

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
  expect(
    container.querySelector("svg[aria-hidden='true'] path")?.getAttribute("d")
  ).toBe(
    "M3 2.75A2.75 2.75 0 0 1 5.75 0h14.5a.75.75 0 0 1 .75.75v20.5a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1 0-1.5h5.25v-4H6A1.5 1.5 0 0 0 4.5 18v.75c0 .716.43 1.334 1.05 1.605a.75.75 0 0 1-.6 1.374A3.251 3.251 0 0 1 3 18.75ZM19.5 1.5H5.75c-.69 0-1.25.56-1.25 1.25v12.651A2.989 2.989 0 0 1 6 15h13.5Z"
  )
  expect(container.querySelector("kbd")?.textContent).toBe("#42")
  expect(
    Array.from(container.querySelectorAll("kbd svg")).some((element) =>
      element.getAttribute("class")?.includes("lucide-git-pull-request-arrow")
    )
  ).toBe(true)
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

  const token = screen.getByText("#product").parentElement

  expect(token?.className).toContain("bg-current/10")
  expect(token?.className).toContain("text-[#1264A3]")
  expect(token?.className).toContain("dark:text-[#31B9E5]")
})

test("renders Notion pages with a file icon", () => {
  const { container } = render(
    <SourceLine
      source={{
        type: "automation",
        provider: { type: "notion", label: "Notion" },
        event: { type: "page.updated", label: "Page updated" },
        metadata: [{ type: "page", label: "Product roadmap" }],
      }}
    />
  )

  expect(screen.getByText("Product roadmap")).toBeDefined()
  expect(container.querySelector("svg[aria-hidden='true']")).toBeDefined()
})

test("renders Linear issues with a dashed circle icon", () => {
  const { container } = render(
    <SourceLine
      source={{
        type: "automation",
        provider: { type: "linear", label: "Linear" },
        event: { type: "issue.comment.created", label: "Issue comment" },
        metadata: [
          { type: "project", label: "Engineering" },
          { type: "issue", label: "ENG-214 Checkout error" },
        ],
      }}
    />
  )

  expect(screen.getByText("ENG-214 Checkout error")).toBeDefined()
  expect(
    container.querySelector("svg[aria-hidden='true']")?.getAttribute("class")
  ).toContain("lucide-circle-dot-dashed")
})

test("renders GitHub issues with a dashed circle icon", () => {
  const { container } = render(
    <SourceLine
      source={{
        type: "automation",
        provider: { type: "github", label: "GitHub" },
        event: { type: "issue.comment.created", label: "Issue comment" },
        metadata: [
          { type: "repository", label: "frontier" },
          { type: "issue", label: "#214 Checkout error" },
        ],
      }}
    />
  )

  expect(container.querySelector("kbd")?.textContent).toBe("#214")
  expect(
    Array.from(container.querySelectorAll("kbd svg")).some((element) =>
      element.getAttribute("class")?.includes("lucide-circle-dot-dashed")
    )
  ).toBe(true)
})
