import { describe, expect, test } from "vitest"
import {
  assertContractStateValue,
  normalizeArtifactContract,
  resolveArtifactStateContract,
} from "../../../contracts/artifacts/contract"
import { getPlaybook } from "../../../contracts/playbooks/catalog"
import { playbookTemplateContracts } from "../../../contracts/playbooks/generated"
import { readArtifactTemplate, templatePartition } from "./catalog"

const template = readArtifactTemplate("meeting-briefing")

describe("artifact template catalog", () => {
  test("reads known templates only", () => {
    expect(template).toBeDefined()
    expect(readArtifactTemplate("missing")).toBeUndefined()
  })

  test("joins catalog metadata with the compiled template", () => {
    const definition = getPlaybook("meeting-briefing")

    expect(template?.version).toBe(definition.version)
    expect(template?.title).toBe(definition.artifact?.title)
    expect(template?.description).toBe(definition.artifact?.description)
    expect(template?.access).toBe(definition.scope)
  })

  test("client contract summary mirrors the compiled contract", () => {
    const compiled = normalizeArtifactContract(template?.contract)

    expect(playbookTemplateContracts["meeting-briefing"]).toEqual(
      compiled.state.map((entry) => ({
        name: entry.name,
        scope: entry.scope,
        description: entry.description,
        schemaName: entry.schemaName,
        schemaVersion: entry.schemaVersion,
        schema: entry.schema,
      }))
    )
  })

  test("partitions canonical instances by template access", () => {
    const personId = "person-1" as Parameters<typeof templatePartition>[1]

    expect(templatePartition({ access: "personal" }, personId)).toBe(
      "person:person-1"
    )
    expect(templatePartition({ access: "organization" }, personId)).toBe(
      "organization"
    )
  })

  test("keeps meeting timeline decisions on one live clock", () => {
    const app = template?.source.find((file) => file.path === "src/App.tsx")

    expect(app?.content).toContain("const now = useNow();")
    expect(app?.content).toContain(
      "orderedMeetings(state.value?.meetings, now)"
    )
    expect(app?.content).toContain("findNextId(meetings, now)")
    expect(app?.content).toContain("upcomingCount(meetings, now)")
    expect(app?.content).toContain("selectMeeting(meetings, chosenId, nextId)")
    expect(app?.content.match(/Date[.]now/g)).toHaveLength(2)
    expect(app?.content).toContain("latestDeliveryIssue")
    expect(app?.content).toContain("will not resend it automatically")
  })
})

test("Meeting Briefing bounds shared content and receipts", () => {
  const meeting = sampleMeeting()

  expect(() => assertMeetingState(meeting)).not.toThrow()
  expect(() => assertMeetingState(maximalMeeting(0))).not.toThrow()
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
        morning: {
          deliveredAt: "2030-01-01T07:30:00.000Z",
          destination: "sam@example.com",
          eventStartsAt: "2030-01-01T08:00:00.000Z",
          revision: 1,
        },
      },
    })
  ).toThrow()
})

function assertMeetingState(meeting: unknown) {
  assertBriefingState(stateWith(meeting))
}

function assertBriefingState(state: unknown) {
  if (template === undefined) {
    throw new Error("Meeting Briefing template is missing.")
  }

  const entry = resolveArtifactStateContract(
    normalizeArtifactContract(template.contract),
    "briefings"
  )
  assertContractStateValue({ entry, value: state })
}

function stateWith(meeting: unknown) {
  return {
    schemaVersion: 3,
    timezone: "UTC",
    scan: {
      scannedAt: "2030-01-01T07:00:00.000Z",
      horizonStart: "2030-01-01T07:00:00.000Z",
      horizonEnd: "2030-01-02T08:00:00.000Z",
      status: "ready",
      gaps: [],
    },
    meetings: { "mb:00000000000000000000000000000000": meeting },
    dispatches: {},
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
    whyItMatters: "External decision meeting",
    status: "queued",
    revision: 0,
    sources: [],
  }
}

function maximalMeeting(index: number) {
  const timestamp = "2030-01-01T08:00:00.000Z"
  const text = "x".repeat(240)
  const finding = maximalFinding(index)

  return {
    event: maximalEvent(timestamp),
    whyItMatters: "s".repeat(160),
    status: "ready",
    revision: index,
    preparedAt: timestamp,
    preparedForFingerprint: "f".repeat(64),
    briefing: {
      purpose: finding,
      outcome: text,
      essentials: Array.from({ length: 3 }, () => finding),
      details: Array.from({ length: 5 }, () => finding),
      unknowns: Array.from({ length: 4 }, () => "g".repeat(160)),
    },
    sources: maximalSources(index, timestamp),
    delivery: {
      morning: {
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
    text: "x".repeat(240),
    kind: "fact",
    area: "commitment",
    sourceIds: Array.from({ length: 3 }, (_, sourceIndex) =>
      `${index}-${sourceIndex}`.padEnd(60, "s")
    ),
  }
}

function maximalEvent(timestamp: string) {
  const attendee = {
    name: "n".repeat(80),
    organization: "o".repeat(80),
    role: "r".repeat(80),
    response: "accepted",
  }

  return {
    provider: "p".repeat(60),
    calendarId: "c".repeat(512),
    eventId: "e".repeat(512),
    seriesId: "s".repeat(512),
    title: "t".repeat(200),
    startsAt: timestamp,
    endsAt: "2030-01-01T09:00:00.000Z",
    status: "confirmed".padEnd(40, "s"),
    fingerprint: "f".repeat(64),
    organizer: attendee,
    attendees: Array.from({ length: 6 }, () => attendee),
    location: "l".repeat(200),
  }
}

function maximalSources(index: number, timestamp: string) {
  return Array.from({ length: 4 }, (_, sourceIndex) => ({
    id: `${index}-${sourceIndex}`.padEnd(60, "i"),
    kind: "email".padEnd(40, "k"),
    label: "l".repeat(120),
    occurredAt: timestamp,
    retrievedAt: timestamp,
    url: `https://example.com/${"u".repeat(380)}`,
  }))
}
