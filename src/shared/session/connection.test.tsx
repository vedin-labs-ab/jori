// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { activateOrganization, authQueryClient, useConvexSession } from "./auth"
import { SessionConnection } from "./connection"

const state = vi.hoisted(() => ({
  session: {
    data: { session: { id: "session" } } as { session: { id: string } } | null,
    isPending: false,
  },
  refetch: vi.fn(async () => undefined),
  token: vi.fn(async () => ({ data: { token: "token" } })),
  prepare: vi.fn(async (_token: string, _organizationId: string) => undefined),
  setActive: vi.fn(async () => undefined),
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
  reportAuth: (_authenticated: boolean) => {},
}))

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({ ...state.session, refetch: state.refetch }),
    convex: { token: state.token },
    organization: { setActive: state.setActive },
  }),
}))
vi.mock("../region/config", () => ({
  regionConfig: { current: "us" },
  requireRegionOrigin: () => "https://us.example.com",
}))
vi.mock("./client", () => ({
  convex: { setAuth: state.setAuth, clearAuth: state.clearAuth },
  convexUrl: "https://convex.example",
}))
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    token = ""
    setAuth(token: string) {
      this.token = token
    }
    async mutation(_reference: unknown, args: { organizationId: string }) {
      await state.prepare(this.token, args.organizationId)
    }
  },
}))

const unmount = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(authQueryClient, "invalidateQueries").mockResolvedValue(undefined)
  state.session = { data: { session: { id: "session" } }, isPending: false }
  state.refetch.mockReset().mockResolvedValue(undefined)
  state.token.mockReset().mockResolvedValue({ data: { token: "token" } })
  state.clearAuth.mockReset()
  state.prepare.mockReset().mockResolvedValue(undefined)
  state.setAuth.mockReset().mockImplementation((fetchToken, reportAuth) => {
    state.reportAuth = reportAuth
    void fetchToken({ forceRefreshToken: true }).then((token: string | null) =>
      reportAuth(Boolean(token))
    )
  })
  unmount.mockClear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  authQueryClient.clear()
})

async function openWorkspace() {
  function Gate() {
    const { isAuthenticated, isLoading } = useConvexSession()
    return isAuthenticated ? (
      <Protected />
    ) : (
      <div>{isLoading ? "Connecting" : "Signed out"}</div>
    )
  }

  function Protected() {
    useEffect(() => unmount, [])
    return <div>Workspace</div>
  }

  const view = render(
    <SessionConnection>
      <Gate />
    </SessionConnection>
  )
  await act(async () => {})
  expect(screen.getByText("Workspace")).toBeDefined()
  return {
    ...view,
    refresh: () =>
      view.rerender(
        <SessionConnection>
          <Gate />
        </SessionConnection>
      ),
  }
}

test("a lost token closes protected queries and reconnects without reloading", async () => {
  await openWorkspace()
  act(() => state.reportAuth(false))
  expect(screen.queryByText("Workspace")).toBeNull()
  expect(screen.getByText("Connecting")).toBeDefined()
  expect(unmount).toHaveBeenCalledTimes(1)

  await act(() => vi.advanceTimersByTimeAsync(1_000))
  expect(state.refetch).toHaveBeenCalledTimes(1)
  expect(authQueryClient.invalidateQueries).toHaveBeenCalledTimes(1)
  expect(state.token).toHaveBeenCalledTimes(2)
  expect(screen.getByText("Workspace")).toBeDefined()
})

/** A token as the server mints it, naming an organization or none. */
function tokenFor(organizationId?: string) {
  const payload = btoa(JSON.stringify({ org: organizationId }))

  return { data: { token: `header.${payload}.signature` } }
}

test("an organization is entered before its token is: member prepared, page moved, workspace still mounted", async () => {
  state.token.mockResolvedValue(tokenFor("first"))
  await openWorkspace()
  const workspace = screen.getByText("Workspace")
  const order: string[] = []
  state.prepare.mockImplementation(async () => {
    order.push("prepare")
  })
  vi.spyOn(authQueryClient, "refetchQueries").mockImplementation(async () => {
    order.push("follow")
  })
  state.token.mockResolvedValue(tokenFor("next"))
  state.setAuth.mockImplementation((fetchToken, reportAuth) => {
    void fetchToken({ forceRefreshToken: false }).then(() => {
      order.push("token")
      reportAuth(true)
    })
  })

  await act(async () => {
    const activation = activateOrganization("next")
    await vi.advanceTimersByTimeAsync(0)
    await activation
  })

  expect(state.setActive).toHaveBeenCalledWith({
    organizationId: "next",
    fetchOptions: { throw: true },
  })
  // Convex holds its socket until the fetcher answers, so by the time it
  // sees the new claim the member is prepared and the page reads the new
  // organization. Nothing was torn down for it.
  expect(order).toEqual(["prepare", "follow", "token"])
  expect(state.prepare).toHaveBeenLastCalledWith(
    expect.stringContaining("header."),
    "next"
  )
  expect(screen.getByText("Workspace")).toBe(workspace)
  expect(unmount).not.toHaveBeenCalled()
})

test("a member who cannot be prepared closes the console without closing the session", async () => {
  state.prepare.mockRejectedValueOnce(new Error("Identity transaction failed"))
  state.token.mockResolvedValue(tokenFor("first"))

  function Preparation() {
    return <div>{useConvexSession().preparation}</div>
  }
  render(
    <SessionConnection>
      <Preparation />
    </SessionConnection>
  )
  await act(async () => {})

  expect(screen.getByText("failed")).toBeDefined()
  expect(state.clearAuth).not.toHaveBeenCalled()
})

test("routine token rotation preserves the mounted workspace", async () => {
  await openWorkspace()
  const workspace = screen.getByText("Workspace")
  const fetchToken = state.setAuth.mock.calls[0][0]

  // Convex rotates by asking its fetcher for a fresh token; React hears
  // nothing of it.
  await act(() => fetchToken({ forceRefreshToken: true }))
  await act(() => vi.advanceTimersByTimeAsync(60_000))

  expect(state.token).toHaveBeenCalledTimes(2)
  expect(screen.getByText("Workspace")).toBe(workspace)
  expect(unmount).not.toHaveBeenCalled()
  expect(state.setAuth).toHaveBeenCalledTimes(1)
  expect(state.refetch).not.toHaveBeenCalled()
})

test("retries back off when token requests keep failing", async () => {
  await openWorkspace()
  state.token.mockRejectedValue(new TypeError("Failed to fetch"))
  act(() => state.reportAuth(false))
  await act(() => vi.advanceTimersByTimeAsync(1_000))
  expect(state.token).toHaveBeenCalledTimes(2)
  await act(() => vi.advanceTimersByTimeAsync(1_999))
  expect(state.token).toHaveBeenCalledTimes(2)
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(state.token).toHaveBeenCalledTimes(3)
  expect(screen.getByText("Connecting")).toBeDefined()
})

test("coming online retries immediately and coalesces resume events", async () => {
  await openWorkspace()
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
  act(() => state.reportAuth(false))
  await act(() => vi.advanceTimersByTimeAsync(10_000))
  expect(state.refetch).not.toHaveBeenCalled()
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
  await act(async () => {
    fireEvent(window, new Event("online"))
    fireEvent(window, new Event("focus"))
    fireEvent(document, new Event("visibilitychange"))
  })
  expect(state.refetch).toHaveBeenCalledTimes(1)
  expect(screen.getByText("Workspace")).toBeDefined()
})

test("an expired login closes the gate and cancels reconnection", async () => {
  const view = await openWorkspace()
  act(() => state.reportAuth(false))
  state.session.data = null
  view.refresh()
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  expect(screen.getByText("Signed out")).toBeDefined()
  expect(state.refetch).not.toHaveBeenCalled()
  expect(state.setAuth).toHaveBeenCalledTimes(1)
})

test("unmounting cancels pending reconnection", async () => {
  const view = await openWorkspace()
  act(() => state.reportAuth(false))
  view.unmount()
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  fireEvent(window, new Event("online"))
  expect(state.refetch).not.toHaveBeenCalled()
})
