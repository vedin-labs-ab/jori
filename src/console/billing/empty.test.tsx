/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BillingActivityEmpty } from "./empty"

describe("BillingActivityEmpty", () => {
  it("explains when billing activity will appear", () => {
    render(<BillingActivityEmpty />)

    expect(screen.getByText("No billing activity yet")).toBeDefined()
    expect(screen.getByText("Costs appear here as Milo works.")).toBeDefined()
  })
})
