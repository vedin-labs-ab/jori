// @vitest-environment jsdom
import { createMemoryHistory, Outlet } from "@tanstack/react-router"
import { cleanup } from "@testing-library/react"
import { type ReactNode } from "react"
import { afterEach, beforeEach, vi } from "vitest"
import { getRouter } from "@/router"
import { Document, Page } from "./pages"

const { viewer, sync } = vi.hoisted(() => ({
  viewer: { signedIn: true, organizationId: "organization" },
  sync: vi.fn(async () => undefined),
}))

vi.mock("@/shared/session/auth", () => ({
  activateOrganization: vi.fn(),
  useSession: () => ({
    data: viewer.signedIn ? { user: { id: "user" } } : null,
    isPending: false,
  }),
  useAuthenticatedSession: () => ({
    data: viewer.signedIn ? { user: { id: "user" } } : null,
    isPending: false,
  }),
  useConvexSession: () => ({
    isAuthenticated: viewer.signedIn,
    isLoading: false,
  }),
  useActiveOrganization: () => ({
    data: { id: viewer.organizationId },
    isPending: false,
  }),
  useListOrganizations: () => ({
    data: [{ id: viewer.organizationId }],
    isPending: false,
  }),
}))
vi.mock("convex/react", async (original) => ({
  ...(await original<typeof import("convex/react")>()),
  useMutation: () => sync,
}))
vi.mock("@/console/context/organization/onboarding/gate", () => ({
  OnboardingGate: () => null,
}))
vi.mock("@/console/integrations/callback", () => ({
  IntegrationCallbackToasts: () => null,
}))
vi.mock("@/console/edit", () => ({
  ConsoleEditing: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/console/folders/drag/context", () => ({
  ConsoleFolderDrag: ({ children }: { children: ReactNode }) => children,
}))
vi.mock("@/console/shared/visibility/directory", () => ({
  OrganizationVisibilityDirectory: ({ children }: { children: ReactNode }) =>
    children,
}))
vi.mock("@/console/folders/section", () => ({ SidebarFolders: () => null }))
vi.mock("@/console/chat/recent", () => ({ useSidebarChats: () => [] }))
// Search has its own Convex binding tests; navigation exercises the persistent shell.
vi.mock("@/console/discovery", () => ({ SidebarSearch: () => null }))
vi.mock("@/console/shell/account", () => ({ SidebarUserButton: () => null }))
vi.mock("@/console/shell/organization", () => ({
  SidebarOrganizationSwitcher: () => null,
}))

export function setup(path = "/jobs") {
  const router = getRouter()
  router.update({
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  })
  for (const route of Object.values(router.routesById)) {
    if (route.isRoot) {
      route.update({ shellComponent: Document, beforeLoad: undefined })
    } else if (route.id !== "/_workspace") {
      route.update({ component: route.children?.length ? Outlet : Page })
      Object.assign(route.options, { loader: undefined })
    }
  }
  return router
}

beforeEach(() => {
  window.scrollTo = vi.fn()
  viewer.signedIn = true
  viewer.organizationId = "organization"
  sync.mockClear()
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})
afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

export { sync, viewer }
