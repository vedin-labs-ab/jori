// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useOnboardingAddress } from "./address"

const navigate = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }))

afterEach(() => {
  cleanup()
  navigate.mockClear()
})

function open(pathname: string, organizationId?: string) {
  window.history.replaceState(null, "", pathname)

  return renderHook(
    (props: { organizationId?: string }) =>
      useOnboardingAddress(props.organizationId),
    { initialProps: { organizationId } }
  )
}

test("the address follows the flow from naming an organization to setting it up", () => {
  const flow = open("/new")

  expect(navigate).not.toHaveBeenCalled()

  flow.rerender({ organizationId: "organization" })

  // In place of /new, so going back never lands on a name already given.
  expect(navigate).toHaveBeenCalledExactlyOnceWith({
    replace: true,
    to: "/onboarding",
  })
})

test("an unfinished organization opened anywhere is set up at its own address", () => {
  open("/chat", "organization")

  expect(navigate).toHaveBeenCalledExactlyOnceWith({
    replace: true,
    to: "/onboarding",
  })
})

test("a flow that leaves for the console is not led back", () => {
  const flow = open("/onboarding", "organization")

  // The closing step changes the page before the organization reads as
  // onboarded, so the flow is still on screen at the console's address.
  window.history.replaceState(null, "", "/integrations")
  flow.rerender({ organizationId: "organization" })

  expect(navigate).not.toHaveBeenCalled()
})
