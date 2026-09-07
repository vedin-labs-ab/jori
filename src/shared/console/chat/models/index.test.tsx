import { modelSlugs } from "@contracts/models/catalog"
// @vitest-environment jsdom
import { tiers } from "@contracts/models/selection"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ModelPicker } from "."

afterEach(cleanup)

test("the regional catalog removes unavailable recommendations and model choices", () => {
  render(
    <ModelPicker
      availableModels={[tiers.standard.model]}
      onSelect={() => undefined}
      selection={tiers.standard}
    />
  )
  openPicker("Model: GPT-5.6 Sol, Medium reasoning")
  expect(screen.queryByRole("menuitemradio", { name: /Premium/ })).toBeNull()
  expect(screen.queryByRole("menuitemradio", { name: /Basic/ })).toBeNull()
  expect(screen.queryByRole("menuitem", { name: "Anthropic" })).toBeNull()
  const vendor = screen.getByRole("menuitem", { name: "OpenAI" })
  vendor.focus()
  fireEvent.keyDown(vendor, { key: "ArrowRight" })
  expect(
    screen.queryByRole("menuitemradio", { name: /GPT-6 Astra/ })
  ).toBeNull()
})

test("the picker cannot offer models before regional eligibility is known", () => {
  render(
    <ModelPicker
      availableModels={undefined}
      onSelect={() => undefined}
      selection={tiers.standard}
    />
  )
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true)
})

function openPicker(name: string) {
  fireEvent.pointerDown(screen.getByRole("button", { name }), {
    button: 0,
    ctrlKey: false,
  })
}

test("the trigger reads the model and effort, and the menu recommends the three", () => {
  const onSelect = vi.fn()

  render(
    <ModelPicker
      availableModels={modelSlugs}
      onSelect={onSelect}
      selection={tiers.standard}
    />
  )
  openPicker("Model: GPT-5.6 Sol, Medium reasoning")

  expect(screen.getByText("Recommendations")).toBeDefined()

  const standard = screen.getByRole("menuitemradio", { name: /Standard/ })

  expect(standard.getAttribute("aria-checked")).toBe("true")
  expect(standard.textContent).toContain("GPT-5.6 Sol · Medium")
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

test("a model outside the tiers keeps the effort in force, and Reasoning sets it", () => {
  const onSelect = vi.fn()
  const selection = {
    model: "anthropic/claude-sonnet-5",
    effort: "high",
  } as const

  render(
    <ModelPicker
      availableModels={modelSlugs}
      onSelect={onSelect}
      selection={selection}
    />
  )
  openPicker("Model: Claude Sonnet 5, High reasoning")

  for (const tier of ["Basic", "Standard", "Premium"]) {
    expect(
      screen
        .getByRole("menuitemradio", { name: new RegExp(tier) })
        .getAttribute("aria-checked")
    ).toBe("false")
  }

  const reasoning = screen.getByRole("menuitem", { name: /Reasoning/ })

  expect(reasoning.textContent).toContain("High")
  reasoning.focus()
  fireEvent.keyDown(reasoning, { key: "ArrowRight" })

  expect(
    screen
      .getByRole("menuitemradio", { name: "High" })
      .getAttribute("aria-checked")
  ).toBe("true")

  fireEvent.click(screen.getByRole("menuitemradio", { name: "Extra high" }))

  expect(onSelect).toHaveBeenCalledWith({
    model: "anthropic/claude-sonnet-5",
    effort: "xhigh",
  })

  openPicker("Model: Claude Sonnet 5, High reasoning")

  const anthropic = screen.getByRole("menuitem", { name: "Anthropic" })

  anthropic.focus()
  fireEvent.keyDown(anthropic, { key: "ArrowRight" })
  fireEvent.click(screen.getByRole("menuitemradio", { name: "Claude Opus 5" }))

  expect(onSelect).toHaveBeenCalledWith({
    model: "anthropic/claude-opus-5",
    effort: "high",
  })
})

test("the chosen model wears the tier it makes", () => {
  render(
    <ModelPicker
      availableModels={modelSlugs}
      onSelect={() => undefined}
      selection={tiers.premium}
    />
  )
  openPicker("Model: GPT-6 Astra, High reasoning")

  const openai = screen.getByRole("menuitem", { name: "OpenAI" })

  openai.focus()
  fireEvent.keyDown(openai, { key: "ArrowRight" })

  expect(
    screen.getByRole("menuitemradio", { name: /^GPT-6 Astra/ }).textContent
  ).toContain("Premium")
})
