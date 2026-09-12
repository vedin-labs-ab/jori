// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, expect, test, vi } from "vitest"
import { TopUpDialog } from "./topup"

vi.mock("sonner", () => ({ toast: { info: vi.fn() } }))
vi.mock("./actions", () => ({
  useBillingCheckout: () => ({ pending: null, topUp: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.mocked(toast.info).mockReset()
})

test("explains why trial organizations cannot top up", () => {
  render(<TopUpDialog available={false} organizationId="organization" />)

  fireEvent.click(screen.getByRole("button", { name: "Top up" }))

  expect(toast.info).toHaveBeenCalledWith(
    "Choose or reactivate a plan before topping up.",
    { id: "billing-plan-required-top-up" }
  )
  expect(screen.queryByText("Top up the wallet")).toBeNull()
})

test("opens top-up controls for organizations on a plan", () => {
  render(<TopUpDialog available organizationId="organization" />)

  fireEvent.click(screen.getByRole("button", { name: "Top up" }))

  expect(screen.getByText("Top up the wallet")).toBeDefined()
  expect(toast.info).not.toHaveBeenCalled()
})

test("requires an explicit business purchase confirmation", () => {
  render(<TopUpDialog available organizationId="organization" />)
  fireEvent.click(screen.getByRole("button", { name: "Top up" }))
  const button = screen.getByRole("button", {
    name: "Continue to checkout",
  }) as HTMLButtonElement
  const agreement = screen.getByRole("checkbox")
  expect(button.disabled).toBe(true)
  expect(agreement.getAttribute("aria-checked")).toBe("false")
  fireEvent.click(agreement)
  expect(button.disabled).toBe(false)
  fireEvent.click(agreement)
  expect(button.disabled).toBe(true)
})
