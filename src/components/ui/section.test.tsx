// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { Section, SectionGroup, SectionHeader } from "./section"

afterEach(cleanup)

test("renders the shared section hierarchy with optional supporting content", () => {
  render(
    <SectionHeader
      action={<button type="button">Invite</button>}
      description="People with access to this organization."
      title={<span>Members</span>}
    />
  )

  expect(
    screen.getByRole("heading", { level: 3, name: "Members" })
  ).toBeDefined()
  expect(
    screen.getByText("People with access to this organization.")
  ).toBeDefined()
  expect(screen.getByRole("button", { name: "Invite" })).toBeDefined()
})

test("composes the shared view and section spacing primitives", () => {
  render(
    <SectionGroup data-testid="group">
      <Section data-testid="section">Content</Section>
    </SectionGroup>
  )

  expect(screen.getByTestId("group").className).toContain("md:gap-6")
  expect(screen.getByTestId("section").className).toContain("gap-3")
})
