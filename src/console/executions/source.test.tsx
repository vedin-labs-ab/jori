// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { SourceParts } from "./source"

afterEach(cleanup)

describe("execution source parts", () => {
  test("renders automation sources as a sentence with the automation emphasized", () => {
    const { container } = render(
      <SourceParts parts={["Triggered by automation:", "Send goose image"]} />
    )

    expect(container.textContent).toBe(
      "Triggered by the Send goose image automation"
    )

    const automationName = screen.getByText("Send goose image")
    expect(automationName.className).toContain("font-medium")
    expect(automationName.className).toContain("text-foreground")
  })
})
