// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { expect, test } from "vitest"
import { Subprocessors } from "./subprocessors"

test("discloses image processing and workspace search alongside the core providers", () => {
  render(<Subprocessors />)
  const link = screen.getByRole("link", { name: "Google Cloud" })
  expect(link.getAttribute("href")).toBe(
    "https://cloud.google.com/terms/data-processing-addendum"
  )
  const row = link.closest("li")
  expect(row?.textContent).toBe("Google Cloud Generates images from prompts.")
  expect(row?.querySelector("img")?.getAttribute("src")).toBe(
    "/logos/subprocessors/google.png"
  )
  const search = screen.getByRole("link", { name: "turbopuffer" })
  expect(search.getAttribute("href")).toBe(
    "https://turbopuffer.com/docs/security"
  )
  expect(search.closest("li")?.textContent).toBe(
    "turbopuffer Indexes content for search."
  )
  expect(search.closest("li")?.querySelector("img")?.getAttribute("src")).toBe(
    "/logos/subprocessors/turbopuffer.svg"
  )
  expect(
    screen.getByRole("link", { name: "Zoho" }).closest("li")?.textContent
  ).toBe("Zoho Hosts the support mailbox.")
  expect(within(screen.getByRole("list")).getAllByRole("link")).toHaveLength(11)
})
