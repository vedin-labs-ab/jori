/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoWorkspaceProvider } from "../../demo/provider"
import { Sharing } from "./sharing"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

afterEach(cleanup)

test("says who the table reaches and revokes its live link in place", () => {
  render(
    <DemoWorkspaceProvider>
      <Sharing />
    </DemoWorkspaceProvider>
  )

  expect(screen.getByRole("button", { name: "6 people" })).toBeDefined()
  expect(screen.getByText(/Narrowed to Finance/)).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Revoke" }))

  expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull()
})
