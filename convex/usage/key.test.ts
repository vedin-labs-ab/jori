import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import {
  shiftUsageDate,
  type UsageAttribution,
  usageDate,
  usageKey,
} from "./key"

// A usage row is found before it is written, so its key and its date have to
// be derivable from the run alone, identically every time.

const folderId = "folder-1" as Id<"folders">
const jobId = "job-1" as Id<"jobs">
const conversationId = "chat-1" as Id<"conversations">
const personId = "person-1" as Id<"persons">

function attribution(
  overrides: Partial<UsageAttribution> = {}
): UsageAttribution {
  return {
    surface: "jori",
    trigger: "schedule",
    model: "openai/gpt-x",
    ...overrides,
  }
}

test("the key names every dimension a breakdown can group by, the model last", () => {
  expect(
    usageKey(
      attribution({
        folderId,
        conversationId,
        job: { id: jobId, label: "Morning digest" },
        personId,
        surface: "slack",
        trigger: "message",
      })
    )
  ).toBe("folder-1:job-1:chat-1:person-1:slack:message:openai/gpt-x")
})

test("work with no folder, job, or person keys as unfiled", () => {
  expect(usageKey(attribution({ trigger: "manual" }))).toBe(
    "-:-:-:-:jori:manual:openai/gpt-x"
  )
})

test("renaming a job does not move its rows", () => {
  const named = (label: string) =>
    usageKey(attribution({ job: { id: jobId, label } }))

  expect(named("Morning digest")).toBe(named("Daily digest"))
})

test("a late instant is already tomorrow east of UTC", () => {
  const timestamp = Date.parse("2026-03-01T13:30:00.000Z")

  expect(usageDate(timestamp, "UTC")).toBe("2026-03-01")
  expect(usageDate(timestamp, "Australia/Sydney")).toBe("2026-03-02")
})

test("an early instant is still yesterday west of UTC", () => {
  const timestamp = Date.parse("2026-03-01T04:00:00.000Z")

  expect(usageDate(timestamp, "UTC")).toBe("2026-03-01")
  expect(usageDate(timestamp, "America/Los_Angeles")).toBe("2026-02-28")
})

test("a date is zero-padded so it sorts as a string", () => {
  expect(usageDate(Date.parse("2026-01-05T12:00:00.000Z"), "UTC")).toBe(
    "2026-01-05"
  )
})

test("shifting a date crosses months and leap days by the calendar", () => {
  expect(shiftUsageDate("2026-03-01", -1)).toBe("2026-02-28")
  expect(shiftUsageDate("2024-03-01", -1)).toBe("2024-02-29")
  expect(shiftUsageDate("2025-12-31", 1)).toBe("2026-01-01")
})

test("shifting is blind to daylight saving, which moves clocks not days", () => {
  // The US spring-forward night is 23 hours long; a day is still a day.
  expect(shiftUsageDate("2026-03-07", 1)).toBe("2026-03-08")
  expect(shiftUsageDate("2026-03-09", -6)).toBe("2026-03-03")
})
