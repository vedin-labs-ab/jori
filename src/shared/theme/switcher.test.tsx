// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ThemeProvider } from "../theme"
import { ThemeSwitcher } from "./switcher"

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

test("choosing a theme applies it, remembers it, and renames the button", () => {
  render(
    <ThemeProvider storageKey="theme">
      <ThemeSwitcher />
    </ThemeProvider>
  )
  const button = screen.getByRole("button", { name: "Theme: System" })

  fireEvent.pointerDown(button, {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  })
  fireEvent.click(screen.getByRole("menuitemradio", { name: "Dark" }))

  expect(document.documentElement.classList.contains("dark")).toBe(true)
  expect(window.localStorage.getItem("theme")).toBe("dark")
  expect(screen.getByRole("button", { name: "Theme: Dark" })).toBeDefined()
})
