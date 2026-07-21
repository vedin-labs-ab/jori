// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { Shield, UserRound } from "lucide-react"
import { afterEach, expect, test } from "vitest"

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

  const mobileTabs = screen
    .getByRole("tablist", { name: "Account settings" })
    .closest('[data-slot="tabs"]')

  expect(mobileTabs?.className.split(" ")).not.toContain("border-b")

  const sidebar = screen.getByRole("list", { name: "Account settings" })
  fireEvent.click(within(sidebar).getByRole("button", { name: "Security" }))

  expect(screen.getByRole("heading", { name: "Security" })).toBeDefined()
  expect(screen.getByText("Sessions")).toBeDefined()
})
