// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { SignOut, useSignOutFlow } from "./sign-out"

const auth = vi.hoisted(() => ({
  mutate: vi.fn(),
  navigate: vi.fn(),
  options: undefined as
    | {
        onError?: () => void
        onSuccess?: () => void
      }
    | undefined,
}))

vi.mock("@better-auth-ui/react", () => ({
  useAuth: () => ({
    authClient: {},
    basePaths: { auth: "/auth" },
    navigate: auth.navigate,
    viewPaths: { auth: { signIn: "sign-in" } },
  }),
  useSignOut: (
    _client: unknown,
    options: { onError?: () => void; onSuccess?: () => void }
  ) => {
    auth.options = options
    return { mutate: auth.mutate }
  },
}))

beforeEach(() => {
  auth.mutate.mockReset()
  auth.navigate.mockReset()
  auth.options = undefined
})

afterEach(cleanup)

test("shows the fullscreen loader and starts sign-out once on mount", async () => {
  render(<SignOut />)

  expect(screen.getByRole("status", { name: "Loading" })).toBeDefined()
  await waitFor(() => expect(auth.mutate).toHaveBeenCalledTimes(1))
})

test("starts sign-out from the triggering interaction before rendering pending", () => {
  render(<SignOutTrigger />)

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }))

  expect(auth.mutate).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("status", { name: "Loading" })).toBeDefined()
})

test.each(["onSuccess", "onError"] as const)(
  "redirects to sign-in after %s",
  (callback) => {
    render(<SignOutTrigger />)
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }))

    auth.options?.[callback]?.()

    expect(auth.navigate).toHaveBeenCalledWith({
      replace: true,
      to: "/auth/sign-in",
    })
  }
)

function SignOutTrigger() {
  const signOut = useSignOutFlow()

  return signOut.isSigningOut ? (
    <FullscreenSkeletonLoader />
  ) : (
    <button onClick={signOut.signOut} type="button">
      Sign out
    </button>
  )
}
