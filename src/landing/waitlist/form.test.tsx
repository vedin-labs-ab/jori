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

vi.mock("@/shared/region/config", async (original) => ({
  ...(await original<typeof import("@/shared/region/config")>()),
  regionConfig: {
    current: "us",
    enabled: new Set(["eu", "us"]),
    origins: { eu: "https://eu.usejori.com", us: "https://us.usejori.com" },
    publicOrigin: "https://usejori.com",
  },
}))

afterEach(() => {
  cleanup()
  joinWaitlist.mockReset()
})

function fill() {
  fireEvent.change(screen.getByRole("textbox", { name: "Work email" }), {
    target: { value: "maya@copperline.example" },
  })
  fireEvent.change(screen.getByLabelText(/by hand every week/), {
    target: { value: "The release checklist." },
  })
  fireEvent.submit(screen.getByRole("button", { name: "Join the waitlist" }))
}

test("submits to the selected region and focuses the confirmation on the page", async () => {
  joinWaitlist.mockResolvedValue({ status: "joined" })
  render(<WaitlistForm />)
  fireEvent.change(screen.getByLabelText("Data region"), {
    target: { value: "eu" },
  })
  fill()
  // The submitting spinner is a status region too, so wait for the
  // confirmation before checking where its effect places focus.
  const confirmation = (await screen.findByText("You're on the list.")).closest(
    "[role=status]"
  )
  expect(joinWaitlist).toHaveBeenCalledWith(
    expect.objectContaining({ email: "maya@copperline.example" }),
    "eu"
  )
  await waitFor(() => {
    expect(document.activeElement).toBe(confirmation)
  })
})

test("an authenticated waitlist submission stays in its account region", async () => {
  joinWaitlist.mockResolvedValue({ status: "joined" })
  render(<WaitlistForm lockedEmail="member@example.test" />)
  expect(screen.queryByLabelText("Data region")).toBeNull()
  fill()
  await screen.findByText("You're on the list.")
  expect(joinWaitlist).toHaveBeenCalledWith(
    expect.objectContaining({ email: "member@example.test" }),
    "us"
  )
})

test("points the rejected input at the reason it was rejected", async () => {
  joinWaitlist.mockResolvedValue({
    status: "rejected",
    field: "email",
    message: "Enter a valid email address.",
  })
  render(<WaitlistForm />)
  const email = screen.getByLabelText("Work email")
  expect(email.getAttribute("aria-describedby")).toBeNull()
  fill()

  await waitFor(() => {
    expect(email.getAttribute("aria-invalid")).toBe("true")
  })

  const describedBy = email.getAttribute("aria-describedby") ?? ""

  expect(document.getElementById(describedBy)?.textContent).toBe(
    "Enter a valid email address."
  )
})

// Submitting disables the button focus was on, so a rejection that left focus
// where it found it would drop it to the document and start the keyboard over
// at the top of the page.
test("moves focus to the field a rejection names", async () => {
  joinWaitlist.mockResolvedValue({
    status: "rejected",
    field: "work",
    message: "Tell us a little more.",
  })
  render(<WaitlistForm />)
  fill()

  await waitFor(() => {
    expect(document.activeElement).toBe(
      screen.getByLabelText(/by hand every week/)
    )
  })
})

test("hands focus back to the button when nothing names a field", async () => {
  joinWaitlist.mockResolvedValue({ status: "throttled" })
  render(<WaitlistForm />)
  fill()

  await waitFor(() => {
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Join the waitlist" })
    )
  })
})

test("marks the field a local rejection names, before any round trip", () => {
  render(<WaitlistForm />)
  fireEvent.submit(screen.getByRole("button", { name: "Join the waitlist" }))

  const email = screen.getByLabelText("Work email")

  expect(email.getAttribute("aria-invalid")).toBe("true")
  expect(document.activeElement).toBe(email)
  expect(joinWaitlist).not.toHaveBeenCalled()
})
