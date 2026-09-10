// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { StableLabel } from "./label"

afterEach(cleanup)

test("only the active label contributes to the control's accessible name", () => {
  const button = (label: string) => (
    <button type="button">
      <StableLabel alternatives={["What", "Runs", "Allowances"]}>
        {label}
      </StableLabel>
    </button>
  )
  const { rerender } = render(button("What"))

  expect(screen.getByRole("button", { name: "What" })).toBeDefined()
  expect(screen.queryByRole("button", { name: "Allowances" })).toBeNull()

  rerender(button("Runs"))

  expect(screen.getByRole("button", { name: "Runs" })).toBeDefined()
  expect(screen.queryByRole("button", { name: "What" })).toBeNull()
})
