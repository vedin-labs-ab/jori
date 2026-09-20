// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { SidebarProvider } from "@/components/ui/sidebar"
import { SidebarOrganizationSwitcher } from "./organization"

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }))
vi.mock("@/shared/session/auth", () => ({
  activateOrganization: vi.fn(),
  useActiveOrganization: () => ({
    data: { id: "current", name: "Vedin Labs" },
  }),
  useListOrganizations: () => ({
    data: [{ id: "other", name: "Other organization" }],
  }),
}))
vi.mock("@/components/auth/organization/organization-view", () => ({
  OrganizationView: ({ organization }: { organization?: { name: string } }) => (
    <span>{organization?.name ?? "Vedin Labs"}</span>
  ),
}))
vi.mock("./settings", () => ({
  OrganizationDialog: ({ open }: { open: boolean }) =>
    open ? <div aria-label="Organization settings" role="dialog" /> : null,
}))

afterEach(cleanup)

test("keyboard users can reach Manage with the menu keys and open settings", async () => {
  render(
    <SidebarProvider>
      <SidebarOrganizationSwitcher />
    </SidebarProvider>
  )
  const trigger = screen.getByRole("button", { name: /Vedin Labs/ })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: "ArrowDown" })
  const manage = await screen.findByRole("menuitem", { name: "Manage" })
  const other = screen.getByRole("menuitem", { name: /Other organization/ })
  await waitFor(() => expect(document.activeElement).toBe(manage))
  fireEvent.keyDown(manage, { key: "ArrowDown" })
  await waitFor(() => expect(document.activeElement).toBe(other))
  fireEvent.keyDown(other, { key: "ArrowUp" })
  await waitFor(() => expect(document.activeElement).toBe(manage))
  fireEvent.keyDown(manage, { key: "Enter" })
  expect(
    await screen.findByRole("dialog", {
      name: "Organization settings",
      hidden: true,
    })
  ).toBeDefined()
})
