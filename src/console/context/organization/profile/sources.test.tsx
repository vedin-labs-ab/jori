/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { WebsitesSection } from "./sources"

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}))

describe("WebsitesSection", () => {
  test("guides people to add the first website", () => {
    render(
      <WebsitesSection
        declared={[]}
        domains={[]}
        organizationId="organization"
        primaryWebsite={undefined}
      />
    )

    expect(screen.getByText("No websites yet")).toBeDefined()
    expect(
      screen.getByText("Add one to give Milo clearer organization context.")
    ).toBeDefined()
    expect(screen.getByRole("button", { name: "Add" })).toBeDefined()
  })
})
