// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { SourceLine } from "./source"

afterEach(cleanup)

test("renders only the scope for source without provider context", () => {
  const { container } = render(
    <SourceLine
      scope="personal"
      source={{
        type: "automation",
      }}
    />
  )

  expect(container.textContent).toBe("Personal")
})

test("renders nothing when the scope is omitted and context is empty", () => {
  const { container } = render(
    <SourceLine
      source={{
        type: "automation",
      }}
    />
  )

  expect(container.textContent).toBe("")
})

test("renders the organization scope as the last item", () => {
  const { container } = render(
    <SourceLine
      scope="organization"
      source={{
        type: "message",
        surface: "slack",
      }}
    />
  )

  expect(container.textContent?.endsWith("Organization")).toBe(true)
  expect(
    Array.from(container.querySelectorAll("svg")).some((element) =>
      element.classList.contains("lucide-building-2")
    )
  ).toBe(true)
})

test("renders provider source labels", () => {
  const { container } = render(
    <SourceLine
      scope="personal"
      source={{
        type: "message",
        surface: "slack",
      }}
    />
  )

  expect(screen.getByText("Slack").className).toContain("font-medium")
  expect(container.querySelector("img")).toBeDefined()
})

test("renders source kind and event labels", () => {
  render(
    <SourceLine
      scope="personal"
      source={{
        event: {
          label: "Issue comment created",
          type: "issue.comment.created",
        },
        kind: { label: "mention", type: "mention" },
        surface: "github",
        type: "automation",
      }}
    />
  )

  expect(screen.getByText("mention").className).toContain("font-mono")
  expect(screen.getByText("issue.comment.created").className).toContain(
    "font-mono"
  )
})

test("renders Jori source labels", () => {
  const { container } = render(
    <SourceLine
      scope="personal"
      source={{
        type: "automation",
        surface: "jori",
      }}
    />
  )

  expect(screen.getByText("Jori").className).toContain("font-medium")
  expect(container.querySelector("svg[aria-hidden='true']")).toBeDefined()
})

test("renders recurring automation source details", () => {
  const { container } = render(
    <SourceLine
      scope="personal"
      details={[{ type: "schedule", label: "Daily at 09:00 UTC" }]}
      source={{
        kind: { label: "recurring", type: "recurring" },
        surface: "jori",
        type: "automation",
      }}
    />
  )

  expect(screen.getByText("recurring")).toBeDefined()
  expect(screen.getByText("Daily at 09:00 UTC")).toBeDefined()
  expect(
    Array.from(container.querySelectorAll("svg[aria-hidden='true']")).some(
      (element) => element.classList.contains("lucide-repeat-2")
    )
  ).toBe(true)
})

test("renders Slack channels as channel chips", () => {
  render(
    <SourceLine
      scope="personal"
      details={[{ type: "channel", label: "#product" }]}
      source={{
        kind: { label: "mention", type: "mention" },
        surface: "slack",
        type: "message",
      }}
    />
  )

  const chip = screen.getByText("#product").parentElement

  expect(screen.getByText("mention")).toBeDefined()
  expect(chip?.className).toContain("bg-current/10")
  expect(chip?.className).toContain("text-[#1264A3]")
  expect(chip?.className).toContain("dark:text-[#31B9E5]")
})

test("renders GitHub source details compactly", () => {
  render(
    <SourceLine
      scope="personal"
      details={[
        { type: "repository", label: "vedin-labs/frontier" },
        { type: "pull_request", label: "#42 Add execution metadata" },
        { type: "comment", label: "This stays in the expanded panel." },
      ]}
      source={{
        event: {
          label: "Pull request review comment created",
          type: "pull_request.review_comment.created",
        },
        surface: "github",
        type: "automation",
      }}
    />
  )

  expect(screen.getByText("GitHub")).toBeDefined()
  expect(screen.getByText("pull_request.review_comment.created")).toBeDefined()
  expect(screen.getByText("frontier")).toBeDefined()
  expect(screen.getByText("#42")).toBeDefined()
  expect(screen.queryByText("This stays in the expanded panel.")).toBeNull()
})

test("renders stopped actors", () => {
  render(
    <SourceLine
      scope="personal"
      source={{
        type: "automation",
        stop: {
          actor: { type: "user", label: "albin@example.com" },
        },
      }}
    />
  )

  expect(screen.getByText("Stopped by")).toBeDefined()
  expect(screen.getByText("albin@example.com")).toBeDefined()
})

test("renders the subtask relation with an emphasized parent title", () => {
  const { container } = render(
    <SourceLine
      scope="personal"
      source={{
        type: "manual",
        surface: "jori",
        parent: { title: "Meeting Briefing" },
      }}
    />
  )

  expect(container.textContent).toBe("JoriSubtask of Meeting BriefingPersonal")
  expect(screen.getByText("Meeting Briefing").className).toContain(
    "font-medium"
  )
  expect(
    Array.from(container.querySelectorAll("svg")).some((element) =>
      element.classList.contains("lucide-corner-down-right")
    )
  ).toBe(true)
})

test("renders a bare subtask when the parent title is unknown", () => {
  render(
    <SourceLine
      scope="personal"
      source={{
        type: "manual",
        surface: "jori",
        parent: {},
      }}
    />
  )

  expect(screen.getByText("Subtask")).toBeDefined()
  expect(screen.queryByText(/of/)).toBeNull()
})
