// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DataRegionInfo, InvitationInfo } from "./guidance"

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}))

afterEach(cleanup)

test("explains the permanence of a data region", () => {
  render(<DataRegionInfo />)

  fireEvent.click(screen.getByRole("button", { name: "What's this?" }))

  expect(
    screen.getByRole("dialog", { name: "About data regions" }).textContent
  ).toContain("transfers are not available yet")
})

test("explains how an invited user signs in", () => {
  render(<InvitationInfo />)

  fireEvent.click(
    screen.getByRole("button", {
      name: "Joining an existing organization?",
    })
  )

  expect(
    screen.getByRole("dialog", { name: "Joining an organization?" }).textContent
  ).toContain("same Google or Microsoft address")
})
