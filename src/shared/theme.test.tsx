// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { ThemeProvider } from "./theme"
import { useTheme } from "./theme/context"
import { resolveTheme, themeScript } from "./theme/scheme"

// The first-paint script is server-only and needs a router; the test runs
// it directly instead.
vi.mock("@tanstack/react-router", () => ({ ScriptOnce: () => null }))

type Listener = () => void

let prefersDark = false
let listeners: Listener[] = []

beforeEach(() => {
  prefersDark = false
  listeners = []
  window.localStorage.clear()
  document.documentElement.classList.remove("dark")
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      get matches() {
        return prefersDark
      },
      addEventListener: (_: string, listener: Listener) => {
        listeners.push(listener)
      },
      removeEventListener: (_: string, listener: Listener) => {
        listeners = listeners.filter((entry) => entry !== listener)
      },
    })),
  })
})
afterEach(cleanup)

function runScript(storageKey: string) {
  new Function(themeScript(storageKey))()
  return document.documentElement.classList.contains("dark")
}

test("the first paint follows a stored choice, then the device", () => {
  prefersDark = true
  expect(runScript("theme")).toBe(true)

  window.localStorage.setItem("theme", "light")
  expect(runScript("theme")).toBe(false)

  prefersDark = false
  window.localStorage.setItem("theme", "dark")
  expect(runScript("theme")).toBe(true)
})

test("resolving a theme only consults the device for system", () => {
  expect(resolveTheme("system", true)).toBe("dark")
  expect(resolveTheme("system", false)).toBe("light")
  expect(resolveTheme("light", true)).toBe("light")
  expect(resolveTheme("dark", false)).toBe("dark")
})

test("the provider tracks the device until a choice is made, then remembers it", () => {
  let setTheme: (theme: "light" | "dark" | "system") => void = () => {}
  function Probe() {
    setTheme = useTheme().setTheme
    return null
  }

  render(
    <ThemeProvider storageKey="theme">
      <Probe />
    </ThemeProvider>
  )
  expect(document.documentElement.classList.contains("dark")).toBe(false)

  act(() => {
    prefersDark = true
    for (const listener of listeners) {
      listener()
    }
  })
  expect(document.documentElement.classList.contains("dark")).toBe(true)

  act(() => setTheme("light"))
  expect(document.documentElement.classList.contains("dark")).toBe(false)
  expect(window.localStorage.getItem("theme")).toBe("light")
  expect(listeners).toHaveLength(0)
})
