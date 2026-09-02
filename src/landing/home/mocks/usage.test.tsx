/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoWorkspaceProvider } from "../../demo/provider"
import { Usage } from "./usage"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

// The charts are Recharts, which needs a laid-out box jsdom never gives it;
// the section's job is the figures and the tree, not how the bars are drawn.
vi.mock("@/shared/console/folders/usage/chart", () => ({
  UsageCharts: () => <div data-testid="charts" />,
}))

afterEach(cleanup)

test("totals the tree and drills into one folder's own usage", async () => {
  render(
    <DemoWorkspaceProvider>
      <Usage />
    </DemoWorkspaceProvider>
  )

  expect(await screen.findByText("$186.75")).toBeDefined()
  expect(screen.getByRole("link", { name: "Flaky test triage" })).toBeDefined()

  fireEvent.click(screen.getByRole("link", { name: "Engineering" }))

  expect(await screen.findByText("$89.90")).toBeDefined()
})
