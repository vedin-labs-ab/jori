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

test("lets the usage breakdown reflow on narrow screens", () => {
  render(<SummaryBand account={null} organizationId="organization" />)

  const meter = screen.getByRole("progressbar")
  const amount = screen.getByText(/of \$25.00/).parentElement
  const usageBreakdown = screen.getByText("Wallet").parentElement

  expect(usageBreakdown?.className).toContain("grid-cols-[auto_minmax(0,1fr)]")
  expect(usageBreakdown?.className).toContain("min-w-0")
  expect(meter.className).toContain("order-2")
  expect(meter.className).toContain("w-full")
  expect(meter.parentElement?.className).toContain("flex-col")
  expect(meter.parentElement?.className).toContain("min-w-0")
  expect(amount?.className).toContain("sm:whitespace-nowrap")
  expect(amount?.className.split(" ")).not.toContain("whitespace-nowrap")
})
