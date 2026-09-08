import { expect, test } from "vitest"
import { readWaitlistEntry, waitlistLimits } from "./waitlist"

const valid = {
  email: "Maya@Copperline.app",
  size: "10-24",
  work: "The Thursday release check.",
}

test("normalizes a valid entry", () => {
  expect(readWaitlistEntry(valid)).toEqual({
    entry: {
      email: "maya@copperline.app",
      size: "10-24",
      work: "The Thursday release check.",
    },
  })
})

test("rejects addresses that cannot be delivered to", () => {
  for (const email of ["maya", "maya@copperline", "ma ya@copperline.app", ""]) {
    expect(readWaitlistEntry({ ...valid, email })).toEqual({
      rejection: { field: "email", message: "Enter a valid email address." },
    })
  }
})

test("rejects a team size outside the published bands", () => {
  expect(readWaitlistEntry({ ...valid, size: "12" })).toEqual({
    rejection: { field: "size", message: "Choose a team size." },
  })
})

test("rejects work that is only whitespace", () => {
  expect(readWaitlistEntry({ ...valid, work: "   \n  " })).toEqual({
    rejection: {
      field: "work",
      message: "Tell us one thing your team does by hand.",
    },
  })
})

test("collapses and clamps work to the shared limit", () => {
  const prefix = "release checks "
  const result = readWaitlistEntry({
    ...valid,
    work: `  release   checks ${"x".repeat(waitlistLimits.work)}`,
  })

  expect(result).toMatchObject({
    entry: {
      work: prefix + "x".repeat(waitlistLimits.work - prefix.length),
    },
  })
})

test("rejects an address longer than the shared limit", () => {
  const local = "a".repeat(waitlistLimits.email)

  expect(
    readWaitlistEntry({ ...valid, email: `${local}@example.com` })
  ).toEqual({
    rejection: { field: "email", message: "Enter a valid email address." },
  })
})
