// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ThemeProvider } from "../theme"
import { ThemePicker } from "./picker"

vi.mock("@tanstack/react-router", () => ({ ScriptOnce: () => null }))

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.classList.remove("dark")
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})
afterEach(cleanup)

test("picking a card checks it, applies the theme, and remembers it", () => {
  render(
    <ThemeProvider storageKey="theme">
      <ThemePicker />
    </ThemeProvider>
  )
  const radio = (name: string) =>
    screen.getByRole("radio", { name }) as HTMLInputElement

  expect(radio("System").checked).toBe(true)

  fireEvent.click(radio("Dark"))

  expect(radio("Dark").checked).toBe(true)
  expect(radio("System").checked).toBe(false)
  expect(document.documentElement.classList.contains("dark")).toBe(true)
  expect(window.localStorage.getItem("theme")).toBe("dark")
})
