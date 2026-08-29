// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { makeExecution, makeOffer, renderExecutionRow } from "../fixtures"
import { type ExecutionOffer } from "../types"

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => ({ items: [], status: "loaded" }),
}))

afterEach(() => {
  cleanup()
})

test("renders live integration offers like action requests", async () => {
  renderExecutionRow(executionWithOffer())

  expect(screen.getByText("Needs action")).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: /offer test/i }))

  await screen.findByText("Offer")

  expect(screen.getByText("Connect Notion")).toBeDefined()
  expect(
    screen.getByText("Connect Notion so Jori can create the requested page.")
  ).toBeDefined()
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDefined()
  expect(screen.getByRole("button", { name: "Connect" })).toBeDefined()
})

test("pages through multiple integration offers", async () => {
  renderExecutionRow(
    executionWithOffer({
      offers: [
        makeOffer({
          id: "offer-1" as ExecutionOffer["id"],
          summary: "Connect Notion so Jori can create the page.",
        }),
        makeOffer({
          expiresAt: 1700001900000,
          id: "offer-2" as ExecutionOffer["id"],
          integration: "slack",
          integrationLabel: "Slack",
          summary: "Connect Slack so Jori can send the update.",
          updatedAt: 1700000002000,
        }),
      ],
    })
  )

  fireEvent.click(screen.getByRole("button", { name: /offer test/i }))

  await screen.findByText("Connect Notion so Jori can create the page.")

  expect(screen.getByText("Offers")).toBeDefined()
  expect(screen.getByText("2")).toBeDefined()

  fireEvent.click(
    screen.getByRole("button", { name: "Next integration offer" })
  )

  expect(screen.getByText("Connect Slack")).toBeDefined()
  expect(
    screen.getByText("Connect Slack so Jori can send the update.")
  ).toBeDefined()
  expect(
    screen.queryByText("Connect Notion so Jori can create the page.")
  ).toBeNull()
})

function executionWithOffer(overrides: { offers?: ExecutionOffer[] } = {}) {
  return makeExecution({
    offers: overrides.offers ?? [makeOffer()],
    task: "Create a Notion page.",
    title: "Offer test",
  })
}
