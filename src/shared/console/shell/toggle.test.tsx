// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConsoleSidebarShell } from "./navigation"

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

test("the sidebar folds from its header, and its rail opens from the organization", () => {
  render(
    <TooltipProvider>
      <SidebarProvider>
        <ConsoleSidebarShell
          account={null}
          organization={<button type="button">Copperline</button>}
        />
      </SidebarProvider>
    </TooltipProvider>
  )
  const organization = screen.getByRole("button", { name: "Copperline" })

  expect(organization.closest("[inert]")).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Close sidebar" }))

  // In the rail the organization's square stands for the way back, so its
  // own menu is out of reach until the sidebar is open again.
  expect(organization.closest("[inert]")).not.toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Open sidebar" }))

  expect(organization.closest("[inert]")).toBeNull()
  expect(screen.queryByRole("button", { name: "Open sidebar" })).toBeNull()
})
