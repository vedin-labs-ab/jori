/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { Activity } from "./activity"
import { BillingActivityEmpty } from "./empty"

afterEach(cleanup)

describe("BillingActivityEmpty", () => {
  it("explains when billing activity will appear", () => {
    render(<BillingActivityEmpty />)

    expect(screen.getByText("No billing activity yet")).toBeDefined()
    expect(screen.getByText("Costs appear here as Jori works.")).toBeDefined()
  })

  it("renders the empty state inside the activity table", () => {
    render(<Activity entries={[]} />)

    expect(
      screen.getByText("No billing activity yet").closest("table")
    ).not.toBeNull()
    expect(screen.getByText("When")).toBeDefined()
  })
})
