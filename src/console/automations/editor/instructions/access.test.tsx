// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

describe("automation instructions tool access", () => {
  test("keeps the footer focused on smart integration mentions", async () => {
    const field = renderInstructionsField({
      description: "",
      surfaces: [],
    })

    expect(await screen.findByRole("textbox")).toBeDefined()
    expect(field.container.textContent).toContain(
      "Type integration names and matching badges appear automatically."
    )
    expect(field.container.textContent).not.toContain("read/write")
  })

  test("renders a zero count for markers without enabled tools", async () => {
    renderInstructionsField({
      description: "Post to GitHub.",
      surfaces: [{ provider: "github", tools: [] }],
    })

    expect(
      await screen.findByRole("button", {
        name: "GitHub tools: 0 enabled. Configure tools.",
      })
    ).toBeDefined()
  })
})
