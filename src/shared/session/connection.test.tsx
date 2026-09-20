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
  setActive: vi.fn(async () => undefined),
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
  reportAuth: (_authenticated: boolean) => {},
  reportRefresh: (_refreshing: boolean) => {},
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
}))

const unmount = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(authQueryClient, "invalidateQueries").mockResolvedValue(undefined)
  state.session = { data: { session: { id: "session" } }, isPending: false }
  state.refetch.mockReset().mockResolvedValue(undefined)
  state.token.mockReset().mockResolvedValue({ data: { token: "token" } })
  state.clearAuth.mockReset()
  state.setAuth
    .mockReset()
    .mockImplementation((fetchToken, reportAuth, reportRefresh) => {
      state.reportAuth = reportAuth
      state.reportRefresh = reportRefresh
      void fetchToken({ forceRefreshToken: true }).then(
        (token: string | null) => reportAuth(Boolean(token))
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

test("activating an organization mints its token in place and forgets the old one", async () => {
  const active = ["auth", "user", "id", "organization", "active", null]
  await openWorkspace()
  authQueryClient.setQueryData(active, { id: "previous" })
  authQueryClient.setQueryData(["auth", "session"], { id: "session" })

  await act(() => activateOrganization("next"))

  expect(state.setActive).toHaveBeenCalledWith({
    organizationId: "next",
    fetchOptions: { throw: true },
  })
  // The workspace remounts on a fresh token; the page never reloads.
  expect(unmount).toHaveBeenCalledTimes(1)
  expect(state.token).toHaveBeenCalledTimes(2)
  expect(screen.getByText("Workspace")).toBeDefined()
  expect(authQueryClient.getQueryData(active)).toBeUndefined()
  expect(authQueryClient.getQueryData(["auth", "session"])).toBeDefined()
})

test("routine rotation and paused token refresh preserve the mounted workspace", async () => {
  await openWorkspace()
  const workspace = screen.getByText("Workspace")
  act(() => state.reportRefresh(true))
  await act(() => vi.advanceTimersByTimeAsync(60_000))
  act(() => state.reportRefresh(false))
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
