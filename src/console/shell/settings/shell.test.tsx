// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { Shield, UserRound } from "lucide-react"
import { afterEach, expect, test, vi } from "vitest"

import { SettingsDialog } from "./shell"

afterEach(cleanup)

const views = [
  { icon: UserRound, label: "Account", value: "account" },
  { icon: Shield, label: "Security", value: "security" },
] as const

test("settings views share one sidebar and content header", () => {
  render(
    <SettingsDialog
      description="Manage your account."
      initialView="account"
      navigationLabel="Account settings"
      onOpenChange={() => undefined}
      open
      views={views}
    >
      {(view) => <p>{view === "account" ? "Profile fields" : "Sessions"}</p>}
    </SettingsDialog>
  )

  expect(screen.getByRole("heading", { name: "Account" })).toBeDefined()
  expect(screen.getByText("Profile fields")).toBeDefined()

  const sidebar = screen.getByRole("list", { name: "Account settings" })
  fireEvent.click(within(sidebar).getByRole("button", { name: "Security" }))

  expect(screen.getByRole("heading", { name: "Security" })).toBeDefined()
  expect(screen.getByText("Sessions")).toBeDefined()
})

test("closing retains the active view and reopening starts at Account", () => {
  const onOpenChange = vi.fn()
  const dialog = (open: boolean) => (
    <SettingsDialog
      description="Manage your account."
      initialView="account"
      navigationLabel="Account settings"
      onOpenChange={onOpenChange}
      open={open}
      views={views}
    >
      {(view) => <p>{view === "account" ? "Profile fields" : "Sessions"}</p>}
    </SettingsDialog>
  )
  const { rerender } = render(dialog(true))
  const sidebar = screen.getByRole("list", { name: "Account settings" })

  fireEvent.click(within(sidebar).getByRole("button", { name: "Security" }))
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })

  expect(onOpenChange).toHaveBeenCalledWith(false)
  expect(screen.getByText("Sessions")).toBeDefined()

  rerender(dialog(false))
  rerender(dialog(true))

  expect(screen.getByText("Profile fields")).toBeDefined()
  expect(screen.queryByText("Sessions")).toBeNull()
})

test("mobile settings tabs identify the active panel and keyboard changes its label", async () => {
  const original = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(max-width: 767px)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  try {
    render(
      <SettingsDialog
        description="Manage your account."
        initialView="account"
        navigationLabel="Account settings"
        onOpenChange={() => undefined}
        open
        views={views}
      >
        {(view) => <p>{view === "account" ? "Profile fields" : "Sessions"}</p>}
      </SettingsDialog>
    )
    const account = screen.getByRole("tab", { name: "Account" })
    const security = screen.getByRole("tab", { name: "Security" })
    const panel = screen.getByRole("tabpanel", { name: "Account" })
    expect(account.getAttribute("aria-controls")).toBe(panel.id)
    expect(security.getAttribute("aria-controls")).toBe(panel.id)
    expect(panel.tabIndex).toBe(0)
    account.focus()
    fireEvent.keyDown(account, { key: "ArrowRight" })
    const changed = await screen.findByRole("tabpanel", { name: "Security" })
    expect(changed.textContent).toBe("Sessions")
    expect(document.activeElement).toBe(security)
  } finally {
    cleanup()
    window.matchMedia = original
  }
})
