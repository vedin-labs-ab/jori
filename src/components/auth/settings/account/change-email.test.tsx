// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ChangeEmail } from "./change-email"

vi.mock("@better-auth-ui/react", () => ({
  useAuth: () => ({
    authClient: {},
    baseURL: "https://example.com",
    viewPaths: { settings: { account: "account" } },
    localization: {
      auth: { email: "Email", emailPlaceholder: "you@example.com" },
      settings: { changeEmail: "Change email", updateEmail: "Update email" },
    },
  }),
  useSession: () => ({ data: { user: { email: "old@example.com" } } }),
  useChangeEmail: () => ({ mutate: vi.fn(), isPending: false }),
}))

afterEach(cleanup)

test("invalid email describes its correction and removes stale errors after editing", () => {
  render(<ChangeEmail />)
  const input = screen.getByRole("textbox", { name: "Email" })
  expect(input.getAttribute("aria-describedby")).toBeNull()
  fireEvent.change(input, { target: { value: "invalid" } })
  fireEvent.invalid(input)
  const error = screen.getByRole("alert")
  expect(screen.getByRole("textbox", { name: "Email", description: error.textContent ?? "" })).toBe(input)
  expect(input.getAttribute("aria-invalid")).toBe("true")
  fireEvent.change(input, { target: { value: "new@example.com" } })
  expect(screen.queryByRole("alert")).toBeNull()
  expect(input.getAttribute("aria-describedby")).toBeNull()
})
