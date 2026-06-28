// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { OrganizationEditDialog } from "./edit"

const discoverMock = vi.hoisted(() => vi.fn())

vi.mock("convex/react", () => ({
  useAction: () => discoverMock,
}))

beforeEach(() => {
  discoverMock.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  discoverMock.mockReset()
})

describe("organization edit website validation", () => {
  test("waits until submit before showing unchanged website validation", async () => {
    render(
      <OrganizationEditDialog
        discovery={undefined}
        onOpenChange={() => undefined}
        onReviewProfile={() => undefined}
        tenantId="tenant"
        website="https://digiproc.com"
      />
    )

    const input = screen.getByLabelText("Website")
    const button = screen.getByRole("button", { name: "Run extraction" })
    const validationMessage =
      "Enter a different website domain to run a new extraction."

    expect(input.getAttribute("aria-invalid")).toBeNull()
    expect(button.getAttribute("disabled")).toBeNull()
    expect(screen.queryByText(validationMessage)).toBeNull()

    fireEvent.click(button)

    expect(await screen.findByText(validationMessage)).toBeDefined()
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(button.getAttribute("disabled")).toBe("")
    expect(discoverMock).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: "localhost" } })

    expect(screen.queryByText(validationMessage)).toBeNull()
    expect(
      screen.getByText("Enter a public website, like example.com.")
    ).toBeDefined()
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(button.getAttribute("disabled")).toBe("")

    fireEvent.change(input, { target: { value: "https://example.com" } })

    expect(input.getAttribute("aria-invalid")).toBeNull()
    expect(button.getAttribute("disabled")).toBeNull()
    expect(screen.queryByText(validationMessage)).toBeNull()

    fireEvent.click(button)

    await waitFor(() => {
      expect(discoverMock).toHaveBeenCalledWith({
        tenantId: "tenant",
        website: "https://example.com",
      })
    })
  })
})
