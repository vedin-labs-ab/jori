// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { toast } from "sonner"
import { afterEach, expect, test, vi } from "vitest"
import { authClient } from "@/shared/session/auth"
import { TeamNameDialog } from "./name"

vi.mock("@/shared/session/auth", () => ({
  authClient: {
    organization: {
      createTeam: vi.fn(async () => ({ data: null, error: null })),
      updateTeam: vi.fn(async () => ({ data: null, error: null })),
    },
  },
}))
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const createTeam = vi.mocked(authClient.organization.createTeam)
const updateTeam = vi.mocked(authClient.organization.updateTeam)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test("creates a team from just a name and closes on success", async () => {
  const onOpenChange = vi.fn()

  render(<TeamNameDialog onOpenChange={onOpenChange} open />)

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: " Engineering " },
  })
  fireEvent.submit(screen.getByRole("button", { name: "Create team" }))

  await vi.waitFor(() => {
    expect(createTeam).toHaveBeenCalledWith({ name: "Engineering" })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalledWith("Team created.")
  })
  expect(updateTeam).not.toHaveBeenCalled()
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("")
})

test("surfaces the server's refusal and stays open", async () => {
  createTeam.mockResolvedValueOnce({
    data: null,
    error: { message: "Only admins can create teams." },
  } as never)
  const onOpenChange = vi.fn()

  render(<TeamNameDialog onOpenChange={onOpenChange} open />)

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Engineering" },
  })
  fireEvent.submit(screen.getByRole("button", { name: "Create team" }))

  await vi.waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith("Only admins can create teams.")
  })
  expect(onOpenChange).not.toHaveBeenCalled()
})

test("renames the selected team and retains its draft across closes and updates", async () => {
  const onOpenChange = vi.fn()
  const team = { id: "team-1", name: "Engineering" }
  const view = render(
    <TeamNameDialog onOpenChange={onOpenChange} open team={team} />
  )

  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: " Product " },
  })
  view.rerender(
    <TeamNameDialog onOpenChange={onOpenChange} open={false} team={team} />
  )
  view.rerender(
    <TeamNameDialog
      onOpenChange={onOpenChange}
      open
      team={{ ...team, name: "Platform" }}
    />
  )
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
    " Product "
  )
  fireEvent.submit(screen.getByRole("button", { name: "Rename team" }))

  await vi.waitFor(() => {
    expect(updateTeam).toHaveBeenCalledWith({
      teamId: "team-1",
      data: { name: "Product" },
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalledWith("Team renamed.")
  })
  expect(createTeam).not.toHaveBeenCalled()
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
    " Product "
  )
})

test.each(["Engineering", "  "])(
  "closes a rename without a request when the submitted name is %j",
  (name) => {
    const onOpenChange = vi.fn()
    render(
      <TeamNameDialog
        onOpenChange={onOpenChange}
        open
        team={{ id: "team-1", name: "Engineering" }}
      />
    )
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } })
    fireEvent.submit(screen.getByRole("button", { name: "Rename team" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(updateTeam).not.toHaveBeenCalled()
    expect(createTeam).not.toHaveBeenCalled()
  }
)

test("keeps a failed rename open with its draft and operation-specific fallback", async () => {
  updateTeam.mockResolvedValueOnce({ data: null, error: {} } as never)
  const onOpenChange = vi.fn()
  render(
    <TeamNameDialog
      onOpenChange={onOpenChange}
      open
      team={{ id: "team-1", name: "Engineering" }}
    />
  )
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Product" },
  })
  fireEvent.submit(screen.getByRole("button", { name: "Rename team" }))

  await vi.waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith("Could not rename the team.")
  })
  expect(onOpenChange).not.toHaveBeenCalled()
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
    "Product"
  )
})
