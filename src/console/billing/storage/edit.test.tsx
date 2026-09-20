// @vitest-environment jsdom

import { termsVersion } from "@contracts/billing"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { StorageEdit, type StorageOverview } from "./edit"

const change = vi.fn()
vi.mock("convex/react", () => ({ useAction: () => change }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
afterEach(() => {
  cleanup()
  change.mockReset()
})
const overview: StorageOverview = {
  extraGb: 30,
  pendingGb: undefined,
  renewsAt: undefined,
  canPurchase: true,
  hasSubscription: true,
}

function form(value: StorageOverview = overview) {
  render(<StorageEdit organizationId="org" overview={value} close={vi.fn()} />)
  return screen.getByRole("spinbutton", { name: "Extra storage in GB" })
}

test("capacity reduction requires explicit purchase agreement and sends the recurring capacity", async () => {
  const input = form()
  fireEvent.change(input, { target: { value: "10" } })
  const submit = screen.getByRole("button", {
    name: "Schedule reduction",
  }) as HTMLButtonElement
  expect(submit.disabled).toBe(true)
  expect(
    screen.getByText("35 GB total for $5.00/month extra, before tax.")
  ).toBeDefined()
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(submit)
  await waitFor(() =>
    expect(change).toHaveBeenCalledWith({
      organizationId: "org",
      extraGb: 10,
      businessPurchase: true,
      termsVersion,
    })
  )
})

test("a blank amount cannot accidentally cancel an existing storage subscription", () => {
  const input = form()
  fireEvent.change(input, { target: { value: "" } })
  expect(
    document.getElementById(input.getAttribute("aria-describedby") ?? "")
      ?.textContent
  ).toContain("Choose")
  fireEvent.click(screen.getByRole("checkbox"))
  expect(
    (
      screen.getByRole("button", {
        name: "Schedule reduction",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true)
  expect(change).not.toHaveBeenCalled()
})

test("purchasing stays disabled if account eligibility changes while editing", () => {
  fireEvent.change(form({ ...overview, canPurchase: false }), {
    target: { value: "60" },
  })
  fireEvent.click(screen.getByRole("checkbox"))
  expect(
    (
      screen.getByRole("button", {
        name: "Confirm increase",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true)
  expect(change).not.toHaveBeenCalled()
})
