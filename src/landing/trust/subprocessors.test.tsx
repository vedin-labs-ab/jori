// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { expect, test } from "vitest"
import { Subprocessors } from "./subprocessors"

test("discloses Google Cloud image processing alongside the core providers", () => {
  render(<Subprocessors />)
  const link = screen.getByRole("link", { name: "Google Cloud" })
  expect(link.getAttribute("href")).toBe(
    "https://cloud.google.com/terms/data-processing-addendum"
  )
  const row = link.closest("li")
  expect(row?.textContent).toBe(
    "Google Cloud Processes image-generation prompts and creates images."
  )
  expect(row?.querySelector("img")?.getAttribute("src")).toBe(
    "/logos/subprocessors/google.png"
  )
  expect(within(screen.getByRole("list")).getAllByRole("link")).toHaveLength(9)
})
