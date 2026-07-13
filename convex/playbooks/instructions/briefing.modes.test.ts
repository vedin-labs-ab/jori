import { describe, expect, test } from "vitest"
import { emailDestination, renderPlaybook } from "../fixture"

const renderBriefing = (options: Record<string, string | number> = {}) =>
  renderPlaybook("meeting-briefing", emailDestination, options)

describe("Meeting Briefing modes", () => {
  test("pre-meeting delivery is opt-in and standalone", () => {
    const defaults = renderBriefing()
    const enabled = renderBriefing({ before: "45" })

    expect(defaults).not.toContain("Lead time: 45 minutes")
    expect(defaults).not.toContain("meeting-briefing:event:")
    expect(enabled).toContain("at start minus 45 minutes")
    expect(enabled).toContain(
      "meeting-briefing:<parent automation ID>:event:<meeting key>:<start UTC>"
    )
    expect(enabled).toContain("stable name `Meeting Briefing · reminder`")
    for (const field of [
      "Meeting key: <meeting key>",
      "Calendar ID: <calendar ID or default>",
      "Event ID: <event ID>",
      "Expected start UTC: <start UTC>",
      "Lead time: 45 minutes",
      "Parent automation ID: <parent automation ID>",
    ]) {
      expect(enabled).toContain(field)
    }
    expect(enabled).toContain("delivery.reminder")
    expect(enabled).toContain(
      "Recompute `event.fingerprint` as the SHA-256 of that exact array with `bash`"
    )
    expect(enabled).not.toContain("Expected fingerprint:")
    expect(enabled).toContain(
      "If the meeting is under way or ended, preserve safe changes"
    )
    expect(enabled).toContain(
      "when prior preparation does not match the new fingerprint, atomically mark it `stale` before research"
    )
    expect(enabled).toContain(
      "Deliver only when `preparedForFingerprint` equals `event.fingerprint`"
    )
    expect(enabled).toContain(
      "finish quietly unless the meeting start is strictly in the future"
    )
  })
})

describe("Meeting Briefing options", () => {
  test("digest-off leaves future research to reminders", () => {
    const instructions = renderBriefing({ digest: "off", before: "60" })

    expect(instructions).toContain(
      "With digest off, leave other scheduled meetings to their just-in-time automations"
    )
    expect(instructions).toContain("inside its 60-minute window")
    expect(instructions).not.toContain("digest:<target UTC>")
  })

  test("meeting scope changes composition", () => {
    expect(renderBriefing()).toContain(
      "attendee outside the requester's organization"
    )
    expect(renderBriefing({ meetings: "internal" })).toContain(
      "Keep internal meetings involving a decision"
    )
    expect(renderBriefing({ meetings: "both" })).toContain(
      "Keep external meetings and consequential internal meetings"
    )
  })
})
