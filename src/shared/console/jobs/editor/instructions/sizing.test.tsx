// @vitest-environment jsdom
import { screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { renderInstructionsField } from "./fixtures"

test("stretches pill controls within the fixed badge height", async () => {
  const field = renderInstructionsField({
    description: "Read @GitHub.",
    surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
  })

  expect(await screen.findByRole("textbox")).toBeDefined()

  const buttonGroup = field.container.querySelector(
    '[data-slot="button-group"]'
  )
  const removeButton = buttonGroup?.querySelector(
    "[data-job-remove-content] button"
  )
  const accessButton = buttonGroup?.querySelector("button:last-of-type")

  expect(buttonGroup?.className).toContain("h-5")
  expect(removeButton?.className).toContain("self-stretch")
  expect(removeButton?.className).not.toContain("h-5")
  expect(accessButton?.className).toContain("self-stretch")
  expect(accessButton?.className).not.toContain("h-5")
})
