// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, expect, test, vi } from "vitest"
import { authClient } from "@/shared/session/auth"
import { TeamCreateDialog } from "./create"

vi.mock("@/shared/session/auth", () => ({
  authClient: {
    organization: {
      createTeam: vi.fn(async () => ({ data: null, error: null })),
    },
  },
}))
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const createTeam = vi.mocked(authClient.organization.createTeam)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test("creates a team from just a name and closes on success", async () => {
  const onOpenChange = vi.fn()

  render(<TeamCreateDialog onOpenChange={onOpenChange} open />)

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: " Engineering " },
  })
  fireEvent.submit(screen.getByRole("button", { name: "Create team" }))

  await vi.waitFor(() => {
    expect(createTeam).toHaveBeenCalledWith({ name: "Engineering" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalledWith("Team created.")
  })
})

test("surfaces the server's refusal and stays open", async () => {
  createTeam.mockResolvedValueOnce({
    data: null,
    error: { message: "Only admins can create teams." },
  } as never)
  const onOpenChange = vi.fn()

  render(<TeamCreateDialog onOpenChange={onOpenChange} open />)

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Engineering" },
  })
  fireEvent.submit(screen.getByRole("button", { name: "Create team" }))

  await vi.waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith("Only admins can create teams.")
  })
  expect(onOpenChange).not.toHaveBeenCalled()
})
