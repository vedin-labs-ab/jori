/* @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { Activity } from "./activity"

afterEach(cleanup)

test("the empty activity table explains when costs will appear", () => {
  render(<Activity entries={[]} />)

  const table = within(screen.getByRole("table"))

  expect(table.getByText("No billing activity yet")).toBeDefined()
  expect(table.getByText("Costs appear here as Jori works.")).toBeDefined()
  expect(table.getByRole("columnheader", { name: "When" })).toBeDefined()
})
