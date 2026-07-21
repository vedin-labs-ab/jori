// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type BillingAccount } from "./actions"
import { AutoTopUpRow } from "./autotopup"

vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }))

afterEach(() => {
  cleanup()
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
