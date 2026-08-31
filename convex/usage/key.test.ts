import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type UsageAttribution, usageDate, usageKey } from "./key"

// A usage row is found before it is written, so its key and its date have to
// be derivable from the run alone, identically every time.

const folderId = "folder-1" as Id<"folders">
const automationId = "automation-1" as Id<"automations">
const personId = "person-1" as Id<"persons">

function attribution(
  overrides: Partial<UsageAttribution> = {}
): UsageAttribution {
  return { surface: "jori", trigger: "schedule", ...overrides }
}

test("the key names every dimension a breakdown can group by", () => {
  expect(
    usageKey(
      attribution({
        folderId,
        automation: { id: automationId, label: "Morning digest" },
        personId,
        surface: "slack",
        trigger: "message",
      })
    )
  ).toBe("folder-1:automation-1:person-1:slack:message")
})

test("work with no folder, automation, or person keys as unfiled", () => {
  expect(usageKey(attribution({ trigger: "manual" }))).toBe("-:-:-:jori:manual")
})

test("renaming an automation does not move its rows", () => {
  const named = (label: string) =>
    usageKey(attribution({ automation: { id: automationId, label } }))

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
