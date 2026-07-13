import { describe, expect, test } from "vitest"
import {
  assertContractStateValue,
  normalizeArtifactContract,
  resolveArtifactStateContract,
} from "../../../contracts/artifacts/contract"
import { type Doc } from "../../_generated/dataModel"
import { createArtifactSourceSnapshot } from "../../artifacts/source"
import { isCurrentPlaybookBlueprint, readPlaybookBlueprint } from "./catalog"

const blueprint = readPlaybookBlueprint("meeting-briefing")

describe("playbook blueprint catalog", () => {
  test("reads known blueprints only", () => {
    expect(blueprint).toBeDefined()
    expect(readPlaybookBlueprint("missing")).toBeUndefined()
  })

  test("detects source and presentation drift", () => {
    if (blueprint === undefined) {
      throw new Error("Meeting Briefing blueprint is missing.")
    }

    const treeId = createArtifactSourceSnapshot(
      blueprint.source.map((file) => ({ ...file }))
    ).treeId
    const artifact = {
      access: blueprint.access,
      title: blueprint.title,
    } as Doc<"artifacts">

    expect(isCurrentPlaybookBlueprint({ artifact, treeId }, blueprint)).toBe(
      true
    )
    expect(
      isCurrentPlaybookBlueprint({ artifact, treeId: "stale" }, blueprint)
    ).toBe(false)
    expect(
      isCurrentPlaybookBlueprint(
        { artifact: { ...artifact, title: "Stale" }, treeId },
        blueprint
      )
    ).toBe(false)
  })

  test("keeps meeting timeline decisions on one live clock", () => {
    const app = blueprint?.source.find((file) => file.path === "src/App.tsx")

    expect(app?.content).toContain("const now = useNow();")
    expect(app?.content).toContain(
      "orderedMeetings(state.value?.meetings, now)"
    )
    expect(app?.content).toContain("findNextId(meetings, now)")
    expect(app?.content).toContain("upcomingCount(meetings, now)")
    expect(app?.content).toContain("selectMeeting(meetings, chosenId, nextId)")
    expect(app?.content.match(/Date[.]now/g)).toHaveLength(2)
  })
})

test("Meeting Briefing bounds shared content and receipts", () => {
  const meeting = sampleMeeting()

  expect(() => assertMeetingState(meeting)).not.toThrow()
  expect(() =>
    assertMeetingState({
      ...meeting,
      briefing: {
        essentials: [],
        details: [
          {
            area: "agenda",
            kind: "fact",
            sourceIds: [],
            text: "x".repeat(501),
          },
        ],
        unknowns: [],
      },
    })
  ).toThrow()
  expect(() =>
    assertMeetingState({
      ...meeting,
      delivery: {
        digest: {
          deliveredAt: "2030-01-01T07:30:00.000Z",
          destination: "sam@example.com",
          eventStartsAt: "2030-01-01T08:00:00.000Z",
          revision: 1,
        },
      },
    })
  ).toThrow()
})

test("Meeting Briefing keeps ten maximally populated meetings under the state limit", () => {
  const meetings = Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => [
      `mb:${index.toString().padStart(32, "0")}`,
      maximalMeeting(index),
    ])
  )
  const state = { ...stateWith(sampleMeeting()), meetings }

  expect(() => assertBriefingState(state)).not.toThrow()
  expect(
    new TextEncoder().encode(JSON.stringify(state)).byteLength
  ).toBeLessThan(256 * 1024)
})

function assertMeetingState(meeting: unknown) {
  assertBriefingState(stateWith(meeting))
}

function assertBriefingState(state: unknown) {
  if (blueprint === undefined) {
    throw new Error("Meeting Briefing blueprint is missing.")
  }

  const entry = resolveArtifactStateContract(
    normalizeArtifactContract(blueprint.contract),
    "briefings"
  )
  assertContractStateValue({ entry, value: state })
}

function stateWith(meeting: unknown) {
  return {
    schemaVersion: 2,
    timezone: "UTC",
    scan: {
      scannedAt: "2030-01-01T07:00:00.000Z",
      horizonStart: "2030-01-01T07:00:00.000Z",
      horizonEnd: "2030-01-02T08:00:00.000Z",
      status: "ready",
      gaps: [],
    },
    meetings: { "mb:00000000000000000000000000000000": meeting },
  }
}

function sampleMeeting() {
  return {
    event: {
      provider: "googleCalendar",
      eventId: "event",
      title: "Customer review",
      startsAt: "2030-01-01T08:00:00.000Z",
      endsAt: "2030-01-01T09:00:00.000Z",
      status: "confirmed",
      fingerprint: "f".repeat(64),
      attendees: [{}],
    },
    selectedBecause: "External decision meeting",
    status: "queued",
    revision: 0,
    sources: [],
  }
}

function maximalMeeting(index: number) {
  const timestamp = "2030-01-01T08:00:00.000Z"
  const text = "x".repeat(300)
  const finding = maximalFinding(index)

  return {
    event: maximalEvent(timestamp),
    selectedBecause: "s".repeat(200),
    status: "ready",
    revision: index,
    preparedAt: timestamp,
    preparedForFingerprint: "f".repeat(64),
    briefing: {
      purpose: finding,
      outcome: text,
      essentials: Array.from({ length: 3 }, () => finding),
      details: Array.from({ length: 8 }, () => finding),
      unknowns: Array.from({ length: 4 }, () => "g".repeat(200)),
    },
    sources: maximalSources(index, timestamp),
    delivery: {
      digest: {
        revision: index,
        eventStartsAt: timestamp,
        deliveredAt: timestamp,
        destination: "email",
      },
      reminder: {
        revision: index,
        eventStartsAt: timestamp,
        deliveredAt: timestamp,
        destination: "slack-dm",
      },
    },
  }
}

function maximalFinding(index: number) {
  return {
    text: "x".repeat(300),
    kind: "fact",
    area: "commitment",
    sourceIds: Array.from({ length: 4 }, (_, sourceIndex) =>
      `${index}-${sourceIndex}`.padEnd(60, "s")
    ),
  }
}

function maximalEvent(timestamp: string) {
  const attendee = {
    name: "n".repeat(100),
    organization: "o".repeat(100),
    role: "r".repeat(100),
    response: "accepted",
  }

  return {
    provider: "p".repeat(60),
    calendarId: "c".repeat(1024),
    eventId: "e".repeat(1024),
    seriesId: "s".repeat(1024),
    title: "t".repeat(200),
    startsAt: timestamp,
    endsAt: "2030-01-01T09:00:00.000Z",
    status: "confirmed".padEnd(40, "s"),
    fingerprint: "f".repeat(64),
    organizer: attendee,
    attendees: Array.from({ length: 8 }, () => attendee),
    location: "l".repeat(200),
  }
}

function maximalSources(index: number, timestamp: string) {
  return Array.from({ length: 6 }, (_, sourceIndex) => ({
    id: `${index}-${sourceIndex}`.padEnd(60, "i"),
    kind: "email".padEnd(40, "k"),
    label: "l".repeat(160),
    occurredAt: timestamp,
    retrievedAt: timestamp,
    url: `https://example.com/${"u".repeat(480)}`,
  }))
}
