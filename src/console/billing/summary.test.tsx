// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { SummaryBand } from "./summary"

vi.mock("./actions", () => ({
  useBillingCheckout: () => ({
    managePortal: vi.fn(),
    pending: null,
  }),
}))

vi.mock("./plan", () => ({
  PlanPicker: () => <button type="button">Choose a plan</button>,
}))

vi.mock("./topup", () => ({
  TopUpDialog: () => <button type="button">Top up</button>,
}))

vi.mock("../automations/help", () => ({
  FieldHelp: () => null,
}))

afterEach(() => {
  cleanup()
})

test("aligns plan detail and usage breakdown on the same rhythm", () => {
  render(<SummaryBand account={null} organizationId="organization" />)

  const planDetail = screen.getByText(
    "14 days of everything Milo does. Starts with the first run."
  )
  const usageBreakdown = screen.getByText("Wallet").parentElement

  expect(planDetail.className).toContain("mt-1.5")
  expect(usageBreakdown?.className).toContain("mt-1.5")
})
