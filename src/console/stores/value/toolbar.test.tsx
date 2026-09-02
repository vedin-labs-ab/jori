// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { type StoreDetail } from "@/shared/console/stores/types"
import { StoreToolbar } from "./toolbar"

afterEach(cleanup)

const store = {
  name: "Team roster",
  ownerName: "Ada Lovelace",
  ownerImage: undefined,
  updatedAt: Date.now() - 2 * 60 * 60 * 1000,
  version: 7,
} as StoreDetail

test("shows provenance, freshness, and version, then the tools slot", () => {
  render(
    <StoreToolbar
      store={store}
      tools={<button type="button">Value tool</button>}
    />
  )

  expect(screen.getByText("Ada Lovelace")).toBeDefined()
  expect(screen.getByText(/^Updated /)).toBeDefined()
  expect(screen.getByText("v7")).toBeDefined()
  expect(screen.getByRole("button", { name: "Value tool" })).toBeDefined()
})

test("reads a never-written store as Jori's own at v0", () => {
  render(
    <StoreToolbar
      store={{ ...store, ownerName: undefined, version: 0 } as StoreDetail}
      tools={null}
    />
  )

  expect(screen.getByText("Jori")).toBeDefined()
  expect(screen.getByText("v0")).toBeDefined()
})
