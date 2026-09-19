// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { getFunctionName } from "convex/server"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../../../../convex/_generated/api"
import { FolderUsage } from "./view"

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }))

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../../test/router")).Link,
}))

vi.mock("convex/react", () => ({ useQuery, useAction: () => vi.fn() }))

afterEach(() => {
  cleanup()
  useQuery.mockReset()
})

function renderUsage(folderId?: string) {
  render(
    <FolderUsage
      days={7}
      folderId={folderId as never}
      onDaysChange={() => undefined}
      organizationId="organization"
    />
  )

  return useQuery.mock.calls[0]
}

test("a folder's usage is the overview of that folder's subtree", () => {
  expect(renderUsage("folders:1")).toEqual([
    api.folders.usage.overview,
    { organizationId: "organization", days: 7, folderId: "folders:1" },
  ])
  expect(useQuery).toHaveBeenCalledWith(api.files.capacity.console.overview, {
    organizationId: "organization",
    folderId: "folders:1",
  })
  expect(useQuery).toHaveBeenCalledTimes(2)
  expect(
    screen.queryByRole("region", { name: "Organization credit" })
  ).toBeNull()
})

test("organization Usage shows current credit separately from the spend window", () => {
  mockBilling(true)
  renderUsage()
  expect(useQuery).toHaveBeenCalledWith(api.billing.console.overview, {
    organizationId: "organization",
  })
  const credit = screen.getByRole("region", { name: "Organization credit" })
  expect(within(credit).getByText("Available credit")).toBeDefined()
  expect(within(credit).getByText("$45.00")).toBeDefined()
  expect(within(credit).getByText("$25.00", { exact: false })).toBeDefined()
  expect(within(credit).getByText("Monthly")).toBeDefined()
  fireEvent.click(within(credit).getByRole("button", { name: "Top up" }))
  expect(
    screen.getByRole("dialog", { name: "Top up the wallet" })
  ).toBeDefined()
})

test("organization Usage follows Billing's restriction on funding a wallet", () => {
  mockBilling(false)
  renderUsage()
  const topUp = screen.getByRole("button", { name: "Top up" })
  expect(topUp.getAttribute("aria-disabled")).toBe("true")
  fireEvent.click(topUp)
  expect(screen.queryByRole("dialog", { name: "Top up the wallet" })).toBeNull()
})

test("organization Usage waits for billing instead of showing a zero balance", () => {
  renderUsage()
  expect(screen.getByLabelText("Loading available credit")).toBeDefined()
  expect(screen.queryByText("$0.00")).toBeNull()
  expect(screen.queryByRole("button", { name: "Top up" })).toBeNull()
})

function mockBilling(canFundWallet: boolean) {
  useQuery.mockImplementation((query) =>
    getFunctionName(query) === "billing/console:overview"
      ? {
          account: {
            state: { kind: "active" },
            micros: { allowance: 20_000_000, wallet: 25_000_000 },
            canFundWallet,
          },
          entries: [],
        }
      : undefined
  )
}

test("without a folder the whole tree is asked for, and no folder is named", () => {
  // Named as absent rather than undefined: the query's argument validator
  // takes the folder as optional, not as a key holding nothing.
  expect(renderUsage()?.[1]).toStrictEqual({
    organizationId: "organization",
    days: 7,
  })
})
