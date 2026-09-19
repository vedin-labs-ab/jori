// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type BillingAccount } from "./actions"
import { SummaryBand } from "./summary"

vi.mock("./actions", () => ({
  useBillingCheckout: () => ({ pending: null, managePortal: vi.fn() }),
}))
vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../test/router")).Link,
}))
afterEach(cleanup)

const paused: BillingAccount = {
  state: { kind: "paused" },
  micros: { allowance: 0, wallet: 15_000_000 },
  renewsAt: undefined,
  topUp: { charged: { micros: 0 } },
  hasCustomer: true,
  canSubscribe: true,
  canFundWallet: false,
}

test("a revoked plan can subscribe again while keeping access to billing history", () => {
  render(
    <SummaryBand
      account={paused}
      deletesAt={Date.UTC(2026, 11, 18, 12)}
      organizationId="organization"
    />
  )
  expect(screen.getByText("Paused")).toBeDefined()
  // The badge's hint is the only place the page says what a pause costs.
  expect(
    screen.getByRole("button", { name: "What a paused plan means" })
  ).toBeDefined()
  expect(screen.getByRole("button", { name: "Manage billing" })).toBeDefined()
  fireEvent.click(screen.getByRole("button", { name: "Subscribe" }))
  expect(
    screen.getByRole("dialog", { name: "Subscribe to Cloud" })
  ).toBeDefined()
  expect(
    screen
      .getByRole("button", { name: "Continue to checkout" })
      .hasAttribute("disabled")
  ).toBe(true)
})

test.each(["active", "paused"] as const)(
  "a %s account without checkout permission keeps only billing management",
  (kind) => {
    render(
      <SummaryBand
        account={{ ...paused, state: { kind }, canSubscribe: false }}
        organizationId="organization"
      />
    )
    expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull()
    expect(screen.getByRole("button", { name: "Manage billing" })).toBeDefined()
  }
)
