// @vitest-environment jsdom

import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type Route as RootRoute } from "@/routes/__root"
import { Route as ChatRoute } from "@/routes/_workspace/chat/index"
import { Route as ConsoleRoute } from "@/routes/console"
import { SidebarOrganizationSwitcher } from "./organization"

const { auth, navigate, toast } = vi.hoisted(() => ({
  navigate: vi.fn(async () => undefined),
  auth: {
    activateOrganization: vi.fn(),
    organizations: [
      {
        id: "vedin",
        metadata: { onboarded: true },
        name: "Vedin Labs",
        slug: "vedin-labs",
      },
      { id: "test", metadata: { onboarded: true }, name: "test", slug: "test" },
      // Created and left: its onboarding was never finished.
      { id: "other", name: "Other organization", slug: "other" },
    ],
  },
  toast: { error: vi.fn() },
}))

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
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

vi.mock("@/components/ui/sidebar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/ui/sidebar")>()),
  SidebarMenuButton: ({
    children,
    size: _size,
    isActive: _isActive,
    ...props
  }: React.ComponentProps<"button"> & {
    size?: string
    isActive?: boolean
  }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  useSidebar: () => ({ isMobile: false }),
}))

vi.mock("@/console/billing", () => ({
  BillingSettings: () => <p>Workspace billing</p>,
}))
vi.mock("sonner", () => ({ toast }))

beforeEach(() => {
  navigate.mockClear()
  auth.activateOrganization.mockReset()
  toast.error.mockReset()
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, "", "/")
})

/** Opens the switcher's menu the way a pointer does. */
function openMenu(trigger: RegExp) {
  fireEvent.pointerDown(screen.getByRole("button", { name: trigger }), {
    button: 0,
    ctrlKey: false,
  })
}

test("keeps the switcher open with a stable pending organization row", async () => {
  auth.activateOrganization.mockImplementation(
    () => new Promise(() => undefined)
  )
  render(<SidebarOrganizationSwitcher />)

  openMenu(/Vedin Labs/)
  fireEvent.click(await screen.findByRole("menuitem", { name: /test/ }))

  await waitFor(() =>
    expect(auth.activateOrganization).toHaveBeenCalledWith("test")
  )
  expect(
    screen.getByRole("status", { name: "Switching to test" })
  ).toBeDefined()
  expect(screen.getByRole("menu").getAttribute("aria-busy")).toBe("true")
  const pendingItem = screen.getByRole("menuitem", { name: /test/ })
  expect(pendingItem.textContent).toContain("Avatar")
  expect(pendingItem.getAttribute("aria-disabled")).toBe("true")
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

test("an organization in onboarding offers only the way to another", async () => {
  render(<SidebarOrganizationSwitcher onboarding="current" />)

  openMenu(/Vedin Labs/)

  expect(await screen.findByRole("menuitem", { name: /test/ })).toBeDefined()
  expect(
    screen.queryByRole("menuitem", { name: /Create organization/ })
  ).toBeNull()
  expect(screen.queryByRole("button", { name: /Manage/ })).toBeNull()
})

test("a new organization shows none as chosen, and going back needs no activating", async () => {
  window.history.replaceState(null, "", "/new")
  render(<SidebarOrganizationSwitcher onboarding="new" />)

  // The organization still active behind the new one is one to go back to,
  // listed with the rest instead of shown as where the person is.
  openMenu(/New organization/)
  fireEvent.click(await screen.findByRole("menuitem", { name: /Vedin Labs/ }))

  await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/chat" }))
  expect(auth.activateOrganization).not.toHaveBeenCalled()
})

test("an organization left mid-onboarding says so, and only that one does", async () => {
  render(<SidebarOrganizationSwitcher />)

  openMenu(/Vedin Labs/)

  const unfinished = await screen.findByRole("menuitem", {
    name: /Other organization/,
  })
  expect(unfinished.textContent).toContain("Finish setup")
  expect(
    screen.getByRole("menuitem", { name: /test/ }).textContent
  ).not.toContain("Finish setup")
})

test("a finished switch puts the menu away and leaves it usable", async () => {
  auth.activateOrganization.mockResolvedValue(undefined)
  render(<SidebarOrganizationSwitcher />)
  const open = () => openMenu(/Vedin Labs/)

  open()
  fireEvent.click(await screen.findByRole("menuitem", { name: /test/ }))

  // The console stays mounted across a switch, this menu with it, so
  // nothing but the switch ending can clear its state.
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())

  open()
  expect(
    (await screen.findByRole("menuitem", { name: /test/ })).getAttribute(
      "aria-disabled"
    )
  ).toBeNull()
  expect(screen.queryByRole("status", { name: /Switching/ })).toBeNull()
})

test("restores the switcher after a failed organization change", async () => {
  auth.activateOrganization.mockRejectedValue(new Error("network"))
  render(<SidebarOrganizationSwitcher />)

  openMenu(/Vedin Labs/)
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

test.each(["portal", "storage", "subscribed", "topped-up", "canceled"])(
  "a %s return survives the console redirect and opens Billing",
  async (status) => {
    window.history.replaceState(
      null,
      "",
      `/console?billing=${status}&ignored=value`
    )
    const root = createRootRoute({
      beforeLoad: (
        _context: Parameters<
          NonNullable<typeof RootRoute.options.beforeLoad>
        >[0]
      ): void => undefined,
    })
    const consoleRoute = createRoute({
      validateSearch: ConsoleRoute.options.validateSearch,
      beforeLoad: ConsoleRoute.options.beforeLoad,
      getParentRoute: () => root,
      path: "/console",
    })
    const chatRoute = createRoute({
      getParentRoute: () => root,
      path: "/chat",
      validateSearch: ChatRoute.options.validateSearch,
      component: SidebarOrganizationSwitcher,
    })
    const history = createBrowserHistory()
    const router = createRouter({
      routeTree: root.addChildren([consoleRoute, chatRoute]),
      history,
    })
    try {
      render(<RouterProvider router={router} />)
      expect(
        await screen.findByRole("heading", { name: "Billing" })
      ).toBeDefined()
      expect(await screen.findByText("Workspace billing")).toBeDefined()
      expect(router.state.location.pathname).toBe("/chat")
      expect(router.state.location.search).toEqual({ billing: status })
      expect(window.location.search).toBe(`?billing=${status}`)
    } finally {
      cleanup()
      history.destroy()
    }
  }
)

test("the console is left only once what comes next is ready to take its place", async () => {
  let ready: () => void = () => undefined
  const prepare = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        ready = resolve
      })
  )
  render(<SidebarOrganizationSwitcher prepare={prepare} />)

  openMenu(/Vedin Labs/)

  // Started as the menu opens, while the person is still reading it.
  await waitFor(() => expect(prepare).toHaveBeenCalled())

  fireEvent.click(
    await screen.findByRole("menuitem", { name: /Create organization/ })
  )
  expect(navigate).not.toHaveBeenCalled()

  ready()
  await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/new" }))
})
