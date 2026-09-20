// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useOnboardingAddress } from "./address"

const router = vi.hoisted(() => ({
  navigate: vi.fn(async () => undefined),
  pathname: "/new",
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => router.navigate,
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => string
  }) => select({ location: { pathname: router.pathname } }),
}))

afterEach(() => {
  cleanup()
  router.navigate.mockClear()
})

test("the address follows the flow from naming an organization to setting it up", () => {
  router.pathname = "/new"
  const flow = renderHook(
    ({ organizationId }: { organizationId?: string }) =>
      useOnboardingAddress(organizationId, false),
    { initialProps: {} }
  )

  expect(router.navigate).not.toHaveBeenCalled()

  flow.rerender({ organizationId: "organization" })

  // In place of /new, so going back never lands on a name already given.
  expect(router.navigate).toHaveBeenCalledExactlyOnceWith({
    replace: true,
    to: "/onboarding",
  })
})

test("an unfinished organization opened anywhere is set up at its own address", () => {
  router.pathname = "/chat"
  renderHook(() => useOnboardingAddress("organization", false))

  expect(router.navigate).toHaveBeenCalledExactlyOnceWith({
    replace: true,
    to: "/onboarding",
  })
})

test("a flow leaving for the console is not led back", () => {
  router.pathname = "/integrations"
  renderHook(() => useOnboardingAddress("organization", true))

  expect(router.navigate).not.toHaveBeenCalled()
})
