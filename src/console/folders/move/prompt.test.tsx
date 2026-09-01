// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type AudienceChange, MovePrompt } from "./prompt"

// The sentence in front of a move is the only place its effect on the
// audience is stated, and a folder's has to answer for its contents.

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))

afterEach(cleanup)

function renderPrompt(
  kind: "folder" | "resource",
  change: Partial<AudienceChange>
) {
  render(
    <MovePrompt
      change={{
        losing: 0,
        gaining: 0,
        becomesOrganizationWide: false,
        ...change,
      }}
      kind={kind}
      name="Finance"
      onCancel={() => {}}
      onConfirm={() => {}}
    />
  )
}

test("a widened folder move says what else comes with it", () => {
  renderPrompt("folder", { gaining: 1, becomesOrganizationWide: true })

  expect(
    screen.getByText(
      "Everyone in the organization will be able to see this folder and everything in it."
    )
  ).toBeTruthy()
})

test("a narrowed folder move counts who loses the contents too", () => {
  renderPrompt("folder", { losing: 3 })

  expect(
    screen.getByText(
      "3 people will lose access to this folder and its contents."
    )
  ).toBeTruthy()
})

test("a resource speaks only for itself", () => {
  renderPrompt("resource", { losing: 1, gaining: 2 })

  expect(
    screen.getByText(
      "1 person will lose access. 2 people more will be able to see it."
    )
  ).toBeTruthy()
})
