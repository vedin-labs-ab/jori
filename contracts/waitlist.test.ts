import { expect, test } from "vitest"
import { readWaitlistEntry, waitlistLimits } from "./waitlist"

const valid = {
  email: "Maya@Copperline.app",
  size: "10-24",
  work: "The Thursday release check.",
}

test("normalizes a valid entry", () => {
  const result = readWaitlistEntry(valid)

  expect(result).toEqual({
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
      error: "Enter a valid email address.",
    })
  }
})

test("rejects a team size outside the published bands", () => {
  expect(readWaitlistEntry({ ...valid, size: "12" })).toEqual({
    error: "Choose a team size.",
  })
})

test("rejects work that is only whitespace", () => {
  expect(readWaitlistEntry({ ...valid, work: "   \n  " })).toEqual({
    error: "Tell us one thing your team does by hand.",
  })
})

test("collapses and clamps work to the shared limit", () => {
  const result = readWaitlistEntry({
    ...valid,
    work: `  release   checks ${"x".repeat(waitlistLimits.work)}`,
  })

  expect("entry" in result).toBe(true)
  expect(result).toMatchObject({
    entry: { work: expect.stringMatching(/^release checks x+$/) },
  })
  expect("entry" in result ? result.entry.work.length : 0).toBe(
    waitlistLimits.work
  )
})

test("rejects an address longer than the shared limit", () => {
  const local = "a".repeat(waitlistLimits.email)

  expect(
    readWaitlistEntry({ ...valid, email: `${local}@example.com` })
  ).toEqual({ error: "Enter a valid email address." })
})
