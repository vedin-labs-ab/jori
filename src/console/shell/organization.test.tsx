// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { SidebarOrganizationSwitcher } from "./organization"

const { auth, toast } = vi.hoisted(() => ({
  auth: {
    activateOrganization: vi.fn(),
    organizations: [
      { id: "vedin", name: "Vedin Labs", slug: "vedin-labs" },
      { id: "test", name: "test", slug: "test" },
      { id: "other", name: "Other organization", slug: "other" },
    ],
  },
  toast: { error: vi.fn() },
}))

vi.mock("@/shared/session/auth", () => ({
  activateOrganization: auth.activateOrganization,
  useActiveOrganization: () => ({ data: auth.organizations[0] }),
  useListOrganizations: () => ({ data: auth.organizations }),
}))

vi.mock("@/components/auth/organization/organization-view", () => ({
  OrganizationView: ({
    organization = auth.organizations[0],
  }: {
    organization?: { name: string }
  }) => (
    <div>
      <span>Avatar</span>
      <span>{organization.name}</span>
    </div>
  ),
}))

vi.mock("@/components/auth/organization/create-organization-dialog", () => ({
  CreateOrganizationDialog: () => null,
}))

vi.mock("@/components/ui/sidebar", () => ({
  SidebarMenuButton: ({
    children,
    size: _size,
    ...props
  }: React.ComponentProps<"button"> & { size?: string }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  useSidebar: () => ({ isMobile: false }),
}))

vi.mock("./settings", () => ({ OrganizationDialog: () => null }))
vi.mock("sonner", () => ({ toast }))

beforeEach(() => {
  auth.activateOrganization.mockReset()
  toast.error.mockReset()
})

afterEach(cleanup)

test("keeps the switcher open with a stable pending organization row", async () => {
  auth.activateOrganization.mockImplementation(
    () => new Promise(() => undefined)
  )
  render(<SidebarOrganizationSwitcher />)

  fireEvent.pointerDown(screen.getByRole("button", { name: /Vedin Labs/ }), {
    button: 0,
    ctrlKey: false,
  })
  fireEvent.click(await screen.findByRole("menuitem", { name: /test/ }))

  await waitFor(() =>
    expect(auth.activateOrganization).toHaveBeenCalledWith("test")
  )
  const spinner = screen.getByRole("status", { name: "Switching to test" })
  expect(spinner.getAttribute("class")).toContain("size-3.5")
  expect(screen.getByRole("menu").getAttribute("aria-busy")).toBe("true")
  const pendingItem = screen.getByRole("menuitem", { name: /test/ })
  expect(pendingItem.textContent).toContain("Avatar")
  expect(pendingItem.getAttribute("aria-disabled")).toBe("true")
  expect(pendingItem.getAttribute("class")).toContain(
    "data-disabled:opacity-50"
  )
  expect(
    screen
      .getByRole("menuitem", { name: /Other organization/ })
      .getAttribute("aria-disabled")
  ).toBe("true")
  expect(
    screen
      .getByRole("menuitem", { name: /Create organization/ })
      .getAttribute("aria-disabled")
  ).toBe("true")
  expect(
    (screen.getByRole("button", { name: /Manage/ }) as HTMLButtonElement)
      .disabled
  ).toBe(true)
  const trigger = document.querySelector<HTMLButtonElement>(
    "[data-slot=dropdown-menu-trigger]"
  )
  expect(trigger?.disabled).toBe(true)
})

test("restores the switcher after a failed organization change", async () => {
  auth.activateOrganization.mockRejectedValue(new Error("network"))
  render(<SidebarOrganizationSwitcher />)

  fireEvent.pointerDown(screen.getByRole("button", { name: /Vedin Labs/ }), {
    button: 0,
    ctrlKey: false,
  })
  fireEvent.click(await screen.findByRole("menuitem", { name: /test/ }))

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't switch organization. Try again."
    )
  )
  expect(screen.queryByRole("status", { name: "Switching to test" })).toBeNull()
  expect(screen.getByRole("menuitem", { name: /test/ })).toBeDefined()
  expect(
    (screen.getByRole("button", { name: /Manage/ }) as HTMLButtonElement)
      .disabled
  ).toBe(false)
})
