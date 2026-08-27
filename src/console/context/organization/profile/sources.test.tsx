/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { WebsitesSection } from "./sources"

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
}))

describe("WebsitesSection", () => {
  test("renders nothing before a main website exists", () => {
    const { container } = render(
      <WebsitesSection
        declared={["partner.example"]}
        domains={["docs.example.com"]}
        organizationId="organization"
        primaryWebsite={undefined}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  test("lists the main website with declared domains and an add control", () => {
    render(
      <WebsitesSection
        declared={["partner.example"]}
        domains={[]}
        organizationId="organization"
        primaryWebsite="https://example.com"
      />
    )

    expect(screen.getByText("Websites")).toBeDefined()
    expect(screen.getByText("Main")).toBeDefined()
    expect(screen.getByText("example.com")).toBeDefined()
    expect(screen.getByText("partner.example")).toBeDefined()
    expect(screen.getByRole("button", { name: "Add" })).toBeDefined()
  })
})
