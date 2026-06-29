// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { ActivityMetadataLine } from "./row"

afterEach(() => {
  cleanup()
})

test("constrains plain metadata to one truncating line", () => {
  const text = "very long metadata that should never create a second line"

  render(<ActivityMetadataLine>{text}</ActivityMetadataLine>)

  const content = screen.getByText(text)
  const line = content.parentElement

  expect(content.className).toContain("truncate")
  expect(line?.className).toContain("whitespace-nowrap")
  expect(line?.className).toContain("overflow-hidden")
  expect(line?.className).toContain("flex-1")
  expect(line?.className).toContain("basis-0")
})
