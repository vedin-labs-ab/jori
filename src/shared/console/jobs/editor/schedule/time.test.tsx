// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { JobTimePicker } from "./time"

test("keeps the timezone label on one line and sizes the field to its content", () => {
  render(
    <JobTimePicker
      id="time"
      onValueChange={() => undefined}
      timezone="America/Argentina/Buenos_Aires"
      value="09:00"
    />
  )

  const input = screen.getByLabelText(
    "Time (America/Argentina/Buenos_Aires)"
  ) as HTMLInputElement
  const label = input.labels?.item(0)

  expect(label?.className).toContain("whitespace-nowrap")
  expect(input.parentElement?.className).toContain("@md/editor:w-max")
})
