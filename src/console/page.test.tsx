// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { useOrganizationId } from "./organization/context"
import { rememberTimezone } from "./organization/pending"
import { ConsolePage } from "./page"

const { loading, mutate, organization, session } = vi.hoisted(() => ({
  mutate: vi.fn(async () => undefined),
  loading: {
    activeOrganizationQueries: 0,
    organizationListQueries: 0,
  },
  organization: {
    id: "organization",
    isResolved: false,
    onboarded: true,
  },
  session: {
    isPending: false,
    isSignedIn: true,
  },
}))

vi.mock("@/shared/session/auth", () => ({
  activateOrganization: vi.fn(),
  useActiveOrganization: () => {
    loading.activeOrganizationQueries += 1

    return organization.isResolved
      ? {
          data: {
            id: organization.id,
            metadata: { onboarded: organization.onboarded },
          },
          isPending: false,
        }
      : { data: undefined, isPending: true }
  },
  useConvexSession: () =>
    organization.isResolved
      ? { isAuthenticated: true, isLoading: false }
      : { isAuthenticated: false, isLoading: true },
  useListOrganizations: () => {
    loading.organizationListQueries += 1

    return organization.isResolved
      ? { data: [{ id: "organization" }], isPending: false }
      : { data: undefined, isPending: true }
  },
  useAuthenticatedSession: () => ({
    data: session.isSignedIn ? { user: { id: "user" } } : null,
    isPending: session.isPending,
  }),
}))

vi.mock("@/shared/loading", () => ({
  FullscreenSkeletonLoader: () => <div>Loading console</div>,
}))

vi.mock("convex/react", () => ({
  useMutation: () => mutate,
}))
vi.mock("@/shared/console/time", async (original) => ({
  ...(await original<typeof import("@/shared/console/time")>()),
  localTimezone: () => "Europe/Stockholm",
}))
vi.mock("./onboarding", () => ({
  Onboarding: () => <div>Onboarding</div>,
}))
vi.mock("./integrations/callback", () => ({
  IntegrationCallbackToasts: () => null,
}))
vi.mock("./shell", () => ({
  ConsoleShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}))
vi.mock("./shell/public", () => ({
  PublicConsoleFrame: ({ children }: { children: React.ReactNode }) => children,
}))

beforeEach(() => {
  loading.activeOrganizationQueries = 0
  loading.organizationListQueries = 0
  organization.isResolved = false
  organization.id = "organization"
  organization.onboarded = true
  session.isPending = false
  session.isSignedIn = true
  window.sessionStorage.clear()
  mutate.mockReset().mockResolvedValue(undefined)
})

afterEach(cleanup)

test("starts organization loading while Convex authentication resolves", () => {
  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  expect(screen.getByText("Loading console")).toBeDefined()
  expect(loading.activeOrganizationQueries).toBe(1)
  expect(loading.organizationListQueries).toBe(1)
})

test("keeps signed-out users behind the loader during redirect", () => {
  session.isSignedIn = false

  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  // The gate queries mount alongside the session on purpose — overlapping
  // their round-trips is what keeps the signed-in gate parallel — so a
  // signed-out visitor fires them too, sees only the loader, and is
  // redirected by useAuthenticate.
  expect(screen.getByText("Loading console")).toBeDefined()
  expect(loading.activeOrganizationQueries).toBe(1)
  expect(loading.organizationListQueries).toBe(1)
})

test("hands the initialized organization to the page", async () => {
  organization.isResolved = true

  render(<ConsolePage>{(id) => <div>{id}</div>}</ConsolePage>)

  expect(await screen.findByText("organization")).toBeDefined()
})

test("onboarding stands in for the console until the organization is through it", async () => {
  organization.isResolved = true
  organization.onboarded = false

  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  expect(await screen.findByText("Onboarding")).toBeDefined()
  expect(screen.queryByTestId("shell")).toBeNull()
  expect(screen.queryByText("Console")).toBeNull()
})

test("a nested page reuses the console chrome and gate queries", async () => {
  organization.isResolved = true

  render(
    <ConsolePage>
      {() => <ConsolePage>{(id) => <div>{id}</div>}</ConsolePage>}
    </ConsolePage>
  )

  // One shell, not two: the inner page recognizes the frame around it, so a
  // material page nested in a section frame does not rebuild the console.
  expect(await screen.findByText("organization")).toBeDefined()
  expect(screen.getAllByTestId("shell")).toHaveLength(1)
  expect(loading.activeOrganizationQueries).toBe(1)
  expect(loading.organizationListQueries).toBe(1)
})

test("the organization is readable without the render prop", async () => {
  organization.isResolved = true

  function Reader() {
    return <div>{useOrganizationId() ?? "none"}</div>
  }

  render(<ConsolePage>{() => <Reader />}</ConsolePage>)

  expect(await screen.findByText("organization")).toBeDefined()
})

test("outside a console there is no organization to read", () => {
  function Reader() {
    return <div>{useOrganizationId() ?? "none"}</div>
  }

  render(<Reader />)

  expect(screen.getByText("none")).toBeDefined()
})

test("the zone chosen at creation is declared on the load that follows", async () => {
  organization.isResolved = true
  rememberTimezone("organization", "Asia/Tokyo")

  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  // Only now does the session token carry the organization the mutation is
  // scoped to, which is why the choice waited for this load.
  await vi.waitFor(() =>
    expect(mutate).toHaveBeenCalledWith({
      organizationId: "organization",
      timezone: "Asia/Tokyo",
    })
  )
})

test("a load with no pending choice declares nothing", async () => {
  organization.isResolved = true

  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)
  await screen.findByText("Console")

  // The person sync still runs; the declaration does not.
  expect(mutate).toHaveBeenCalledTimes(1)
  expect(mutate).toHaveBeenCalledWith({
    organizationId: "organization",
    timezone: "Europe/Stockholm",
  })
})

test.each(["shell", "none"] as const)(
  "holds the %s console and its render prop until identity sync commits",
  async (chrome) => {
    organization.isResolved = true
    const sync = pendingSync()
    mutate.mockReturnValueOnce(sync.promise)
    const children = vi.fn(() => <div>Console</div>)

    render(<ConsolePage chrome={chrome}>{children}</ConsolePage>)

    expect(screen.getByText("Loading console")).toBeDefined()
    expect(screen.queryByTestId("shell")).toBeNull()
    expect(children).not.toHaveBeenCalled()
    await act(async () => sync.resolve(undefined))
    expect(screen.getByText("Console")).toBeDefined()
    expect(children).toHaveBeenCalledWith("organization")
  }
)

test("failed initialization stays closed and can be retried", async () => {
  organization.isResolved = true
  mutate.mockRejectedValueOnce(new Error("Identity transaction failed"))
  render(<ConsolePage>{() => <div>Console</div>}</ConsolePage>)

  const retry = await screen.findByRole("button", { name: "Try again" })
  expect(screen.queryByTestId("shell")).toBeNull()
  expect(screen.queryByText("Console")).toBeNull()
  fireEvent.click(retry)
  expect(await screen.findByText("Console")).toBeDefined()
  expect(mutate).toHaveBeenCalledTimes(2)
})

test("a previous organization's completion cannot open the next console", async () => {
  organization.isResolved = true
  const first = pendingSync()
  const second = pendingSync()
  mutate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const page = render(<ConsolePage>{(id) => <div>{id}</div>}</ConsolePage>)

  organization.id = "next-organization"
  page.rerender(<ConsolePage>{(id) => <div>{id}</div>}</ConsolePage>)
  await act(async () => first.resolve(undefined))
  expect(screen.getByText("Loading console")).toBeDefined()
  expect(screen.queryByTestId("shell")).toBeNull()
  await act(async () => second.resolve(undefined))
  expect(screen.getByText("next-organization")).toBeDefined()
})

function pendingSync() {
  let resolve: (value: undefined) => void = () => undefined
  const promise = new Promise<undefined>((complete) => {
    resolve = complete
  })

  return { promise, resolve }
}
