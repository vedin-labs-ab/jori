// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, expect, test, vi } from "vitest"
import { type BillingAccount } from "./actions"
import { AutoTopUpRow } from "./autotopup"

const configure = vi.fn()

vi.mock("convex/react", () => ({ useMutation: () => configure }))
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }))

afterEach(() => {
  cleanup()
  configure.mockReset()
  vi.mocked(toast.info).mockReset()
})

test("names each inline auto top-up control", () => {
  render(
    <AutoTopUpRow
      account={
        {
          autoTopUp: {
            amountMicros: 10_000_000,
            monthlyCapMicros: 100_000_000,
            thresholdMicros: 5_000_000,
          },
          autoTopUpUsedMicros: 0,
          canFundWallet: true,
          plan: "starter",
          state: "active",
        } as BillingAccount
      }
      organizationId="organization"
    />
  )

  expect(
    screen.getByRole("combobox", {
      name: "Auto top-up balance threshold",
    })
  ).toBeDefined()
  expect(
    screen.getByRole("combobox", { name: "Auto top-up amount" })
  ).toBeDefined()
  expect(
    screen.getByRole("combobox", { name: "Monthly auto top-up limit" })
  ).toBeDefined()
})

test("explains why trial organizations cannot enable auto top-up", () => {
  render(
    <AutoTopUpRow
      account={
        {
          autoTopUpUsedMicros: 0,
          canFundWallet: false,
          state: "trial",
        } as BillingAccount
      }
      organizationId="organization"
    />
  )

  fireEvent.click(screen.getByRole("switch", { name: "Auto top-up" }))

  expect(configure).not.toHaveBeenCalled()
  expect(toast.info).toHaveBeenCalledWith(
    "Choose or reactivate a plan to use auto top-up.",
    { id: "billing-plan-required-auto-top-up" }
  )
  expect(
    screen.getByText("Available once the organization is on an active plan.")
  ).toBeDefined()
})
