// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { SourceLine } from "./source"

afterEach(cleanup)

test("renders nothing for source without provider context", () => {
  const { container } = render(
    <SourceLine
      source={{
        type: "automation",
      }}
    />
  )

  expect(container.textContent).toBe("")
})

test("renders provider source labels", () => {
  const { container } = render(
    <SourceLine
      source={{
        type: "message",
        surface: "slack",
      }}
    />
  )

  expect(screen.getByText("Slack").className).toContain("font-medium")
  expect(container.querySelector("img")).toBeDefined()
})

test("renders Milo source labels", () => {
  const { container } = render(
    <SourceLine
      source={{
        type: "automation",
        surface: "milo",
      }}
    />
  )

  expect(screen.getByText("Milo").className).toContain("font-medium")
  expect(container.querySelector("svg[aria-hidden='true']")).toBeDefined()
})

test("renders stopped actors", () => {
  render(
    <SourceLine
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
