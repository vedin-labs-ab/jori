// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { SectionHeader } from "./section"

afterEach(cleanup)

test("renders the shared section hierarchy with optional supporting content", () => {
  render(
    <SectionHeader
      action={<button type="button">Invite</button>}
      description="People with access to this organization."
      title="Members"
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
