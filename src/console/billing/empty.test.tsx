/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { Activity } from "./activity"

vi.mock("@tanstack/react-router", async () => ({
  Link: (await import("../../../test/router")).Link,
}))

afterEach(cleanup)

test("the empty activity table explains when costs will appear", () => {
  render(<Activity entries={[]} />)

  const table = within(screen.getByRole("table"))

  expect(table.getByText("No billing activity yet")).toBeDefined()
  expect(table.getByText("Costs appear here as Jori works.")).toBeDefined()
  expect(table.getByRole("columnheader", { name: "When" })).toBeDefined()
})

type BillingEntry = Parameters<typeof Activity>[0]["entries"][number]

const entries: BillingEntry[] = [
  {
    _id: "allowance" as BillingEntry["_id"],
    _creationTime: 1,
    organizationId: "organization",
    timestamp: 1,
    type: "allowance",
    source: "trial",
    micros: { amount: 10_000_000, balance: 10_000_000 },
  },
  {
    _id: "topup" as BillingEntry["_id"],
    _creationTime: 3,
    organizationId: "organization",
    timestamp: 3,
    type: "topup",
    stripeId: "payment",
    auto: false,
    micros: { amount: 20_000_000, balance: 29_000_000 },
  },
  {
    _id: "debit" as BillingEntry["_id"],
    _creationTime: 2,
    organizationId: "organization",
    timestamp: 2,
    type: "debit",
    runId: "run" as Extract<BillingEntry, { type: "debit" }>["runId"],
    runTitle: "Research",
    tokens: { input: 1, output: 1 },
    micros: { amount: 1_000_000, allowance: 1_000_000, balance: 9_000_000 },
  },
]

function labels() {
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1]?.textContent)
}

test("activity starts newest first and sorts time and signed amounts both ways", () => {
  render(<Activity entries={entries} />)
  expect(labels()).toEqual(["Top-up", "Research", "Trial allowance"])

  fireEvent.click(screen.getByRole("button", { name: "When" }))
  expect(labels()).toEqual(["Trial allowance", "Research", "Top-up"])
  fireEvent.click(screen.getByRole("button", { name: "When" }))
  expect(labels()).toEqual(["Top-up", "Research", "Trial allowance"])

  fireEvent.click(screen.getByRole("button", { name: "Amount" }))
  expect(labels()).toEqual(["Research", "Trial allowance", "Top-up"])
  fireEvent.click(screen.getByRole("button", { name: "Amount" }))
  expect(labels()).toEqual(["Top-up", "Trial allowance", "Research"])

  const run = screen.getByRole("link", { name: "Research" })
  expect(run.getAttribute("href")).toContain("run=run")
  expect(
    within(screen.getByRole("row", { name: /Research/ })).getAllByRole(
      "cell"
    )[2]?.textContent
  ).toBe("-$1.00")
})

test("activity filters each kind, restores everything, and distinguishes no matches", async () => {
  const view = render(<Activity entries={entries} />)
  let current = "What"
  for (const [kind, expected] of [
    ["Runs", ["Research"]],
    ["Allowances", ["Trial allowance"]],
    ["Top-ups", ["Top-up"]],
    ["Everything", ["Top-up", "Research", "Trial allowance"]],
  ] as const) {
    fireEvent.pointerDown(screen.getByRole("button", { name: current }), {
      button: 0,
      ctrlKey: false,
    })
    fireEvent.click(await screen.findByRole("menuitemradio", { name: kind }))
    expect(labels()).toEqual(expected)
    current = kind === "Everything" ? "What" : kind
  }

  fireEvent.pointerDown(screen.getByRole("button", { name: "What" }), {
    button: 0,
    ctrlKey: false,
  })
  fireEvent.click(await screen.findByRole("menuitemradio", { name: "Runs" }))
  view.rerender(
    <Activity entries={entries.filter((entry) => entry.type !== "debit")} />
  )
  expect(screen.getByText("No matching activity.")).toBeDefined()
  expect(screen.queryByText("No billing activity yet")).toBeNull()
})
