// @vitest-environment jsdom
import { tiers } from "@contracts/models/selection"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ModelPicker } from "."

afterEach(cleanup)

function openPicker(name: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name }), {
    button: 0,
    ctrlKey: false,
  })
}

test("the trigger reads as the tier and the menu recommends the three", () => {
  const onSelect = vi.fn()

  render(<ModelPicker onSelect={onSelect} selection={tiers.standard} />)
  openPicker("Model: Standard")

  expect(screen.getByText("Recommendations")).toBeDefined()

  const standard = screen.getByRole("menuitemradio", { name: /Standard/ })

  expect(standard.getAttribute("aria-checked")).toBe("true")
  expect(standard.textContent).toContain("GPT-5.6 Sol")
  expect(
    screen
      .getByRole("menuitemradio", { name: /Premium/ })
      .getAttribute("aria-checked")
  ).toBe("false")
  expect(screen.getByText("More models")).toBeDefined()
  expect(screen.getByRole("menuitem", { name: "OpenAI" })).toBeDefined()
  expect(screen.getByRole("menuitem", { name: "Anthropic" })).toBeDefined()

  fireEvent.click(screen.getByRole("menuitemradio", { name: /Basic/ }))

  expect(onSelect).toHaveBeenCalledWith(tiers.basic)
})

test("a model outside the tiers names itself and is picked at medium effort", () => {
  const onSelect = vi.fn()

  render(
    <ModelPicker
      onSelect={onSelect}
      selection={{ model: "anthropic/claude-sonnet-5", effort: "medium" }}
    />
  )
  openPicker("Model: Claude Sonnet 5")

  for (const tier of ["Basic", "Standard", "Premium"]) {
    expect(
      screen
        .getByRole("menuitemradio", { name: new RegExp(tier) })
        .getAttribute("aria-checked")
    ).toBe("false")
  }

  const anthropic = screen.getByRole("menuitem", { name: "Anthropic" })

  anthropic.focus()
  fireEvent.keyDown(anthropic, { key: "ArrowRight" })
  fireEvent.click(screen.getByRole("menuitemradio", { name: "Claude Opus 5" }))

  expect(onSelect).toHaveBeenCalledWith({
    model: "anthropic/claude-opus-5",
    effort: "medium",
  })
})
