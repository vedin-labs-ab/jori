// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"
import { ThemeProvider } from "../theme"
import { ThemeMenu } from "./menu"

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

test("choosing a card in the menu checks it, applies the theme, and remembers it", () => {
  render(
    <ThemeProvider storageKey="theme">
      <DropdownMenu open>
        <DropdownMenuContent>
          <ThemeMenu />
        </DropdownMenuContent>
      </DropdownMenu>
    </ThemeProvider>
  )
  const item = (name: string) => screen.getByRole("menuitemradio", { name })

  expect(item("System").getAttribute("aria-checked")).toBe("true")

  fireEvent.click(item("Dark"))

  expect(document.documentElement.classList.contains("dark")).toBe(true)
  expect(window.localStorage.getItem("theme")).toBe("dark")
})
