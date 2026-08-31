// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { activateOrganization, authClient } from "@/shared/session/auth"
import { CreateOrganizationDialog } from "./create"
import { takeTimezone } from "./pending"

vi.mock("@/shared/session/auth", () => ({
  activateOrganization: vi.fn(),
  authClient: {
    organization: {
      create: vi.fn(async () => ({ data: { id: "acme" }, error: null })),
    },
  },
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("../shared/time", () => ({ localTimezone: () => "Europe/Stockholm" }))

const create = vi.mocked(authClient.organization.create)

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function open() {
  render(<CreateOrganizationDialog onOpenChange={vi.fn()} open />)
}

function submit() {
  fireEvent.submit(screen.getByRole("button", { name: "Create organization" }))
}

test("offers the browser's zone so the field is never a step", () => {
  open()

  expect(screen.getByLabelText<HTMLInputElement>("Timezone").value).toBe(
    "Europe/Stockholm"
  )
})

test("creates the organization and opens it with the chosen zone kept", async () => {
  open()

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: " Acme " },
  })
  submit()

  await vi.waitFor(() => {
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme" })
    )
    expect(activateOrganization).toHaveBeenCalledWith("acme")
  })
  // Declaring it has to wait for the reload that mints a token carrying the
  // new organization, so the choice is what survives, not the write.
  expect(takeTimezone("acme")).toBe("Europe/Stockholm")
})

test("an unnamed organization is refused before the server sees it", () => {
  open()
  submit()

  expect(screen.getByText("Name your organization.")).toBeDefined()
  expect(create).not.toHaveBeenCalled()
})

test("surfaces the server's refusal and keeps the form", async () => {
  create.mockResolvedValueOnce({
    data: null,
    error: { message: "Jori is not open to your address." },
  } as never)
  open()

  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Acme" } })
  submit()

  await vi.waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "Jori is not open to your address."
    )
  )
  expect(activateOrganization).not.toHaveBeenCalled()
})
