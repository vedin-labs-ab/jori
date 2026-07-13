import { expect, test } from "vitest"
import {
  assertContractStateValue,
  normalizeArtifactContract,
  resolveArtifactStateContract,
} from "../../../contracts/artifacts/contract"
import { readPlaybookBlueprint } from "./catalog"

const blueprint = readPlaybookBlueprint("meeting-briefing")

test("Meeting Briefing keeps sixty compact meetings under the state limit", () => {
  if (blueprint === undefined) {
    throw new Error("Meeting Briefing blueprint is missing.")
  }

  const meetings = Object.fromEntries(
    Array.from({ length: 60 }, (_, index) => [
      `mb:${index.toString().padStart(32, "0")}`,
      compactMeeting(index),
    ])
  )
  const state = {
    schemaVersion: 3,
    timezone: "UTC",
    scan: {
      scannedAt: "2030-01-01T07:00:00.000Z",
      horizonStart: "2030-01-01T07:00:00.000Z",
      horizonEnd: "2030-01-02T08:00:00.000Z",
      status: "ready",
      gaps: [],
    },
    meetings,
    dispatches: {},
  }
  const entry = resolveArtifactStateContract(
    normalizeArtifactContract(blueprint.contract),
    "briefings"
  )

  expect(
    new TextEncoder().encode(JSON.stringify(state)).byteLength
  ).toBeLessThan(256 * 1024)
  expect(() => assertContractStateValue({ entry, value: state })).not.toThrow()
})

function compactMeeting(index: number) {
  const timestamp = `2030-01-01T${String(8 + (index % 12)).padStart(2, "0")}:00:00.000Z`
  const sourceId = `calendar-${index}`
  const point = {
    text: "Confirm the decision and owner before the meeting ends.",
    kind: "recommendation",
    area: "decision",
    sourceIds: [sourceId],
  }

  return {
    event: {
      provider: "googleCalendar",
      calendarId: "primary",
      eventId: `event-${index}`,
      title: `Customer meeting ${index}`,
      startsAt: timestamp,
      endsAt: timestamp,
      status: "confirmed",
      fingerprint: "f".repeat(64),
      attendees: [{ name: "Customer", organization: "Example" }],
    },
    whyItMatters: "A customer decision is expected.",
    status: "ready",
    revision: index,
    preparedAt: timestamp,
    preparedForFingerprint: "f".repeat(64),
    briefing: {
      outcome: "Leave with a decision and named owner.",
      essentials: [point],
      details: [],
      unknowns: [],
    },
    sources: [
      {
        id: sourceId,
        kind: "calendar",
        label: "Calendar event",
        retrievedAt: timestamp,
      },
    ],
  }
}
