/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { WaitlistForm } from "./form"

const joinWaitlist = vi.hoisted(() => vi.fn())

vi.mock("./client", () => ({ joinWaitlist }))

afterEach(() => {
  cleanup()
  joinWaitlist.mockReset()
})

function fill() {
  fireEvent.change(screen.getByLabelText("Work email"), {
    target: { value: "maya@copperline.example" },
  })
  fireEvent.change(screen.getByLabelText(/by hand every week/), {
    target: { value: "The release checklist." },
  })
  fireEvent.submit(screen.getByRole("button", { name: "Join the waitlist" }))
}

test("moves focus to the confirmation, so the swap is never silent", async () => {
  joinWaitlist.mockResolvedValue({ status: "joined" })
  render(<WaitlistForm />)
  fill()

  // The submit button's spinner is a status region too, so match the
  // confirmation by what it says rather than by role alone.
  const confirmation = (await screen.findByText("You're on the list.")).closest(
    "[role=status]"
  )

  expect(confirmation).not.toBeNull()
  expect(document.activeElement).toBe(confirmation)
})

test("points the rejected input at the reason it was rejected", async () => {
  joinWaitlist.mockResolvedValue({
    status: "rejected",
    field: "email",
    message: "Enter a valid email address.",
  })
  render(<WaitlistForm />)
  fill()

  const email = screen.getByLabelText("Work email")

  await waitFor(() => {
    expect(email.getAttribute("aria-invalid")).toBe("true")
  })

  const describedBy = email.getAttribute("aria-describedby") ?? ""

  expect(document.getElementById(describedBy)?.textContent).toBe(
    "Enter a valid email address."
  )
})

test("leaves the inputs undescribed while nothing is wrong", () => {
  render(<WaitlistForm />)

  expect(
    screen.getByLabelText("Work email").getAttribute("aria-describedby")
  ).toBeNull()
})
