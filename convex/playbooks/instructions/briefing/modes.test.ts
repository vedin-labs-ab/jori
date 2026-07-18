import { describe, expect, test } from "vitest"
import {
  emailDestination,
  renderPlaybook,
} from "../../../../test/convex/playbooks"

const renderBriefing = (
  options: Record<string, boolean | number | string> = {}
) => renderPlaybook("meeting-briefing", emailDestination, options)

describe("Meeting Briefing modes", () => {
  test("pre-meeting delivery is opt-in and standalone", () => {
    const defaults = renderBriefing()
    const enabled = renderBriefing({ beforeMeeting: true })

    expect(defaults).not.toContain("start minus 45 minutes")
    expect(defaults).not.toContain(
      "meeting-briefing:<parent automation ID>:event:"
    )
    expect(enabled).toContain("start minus 45 minutes")
    expect(enabled).toContain(
      "meeting-briefing:<parent automation ID>:event:<meeting key>:<start UTC>"
    )
    expect(enabled).toContain(
      "claim the key `reminder:<parent automation ID>:<meeting key>:<start UTC>:<revision>` in `dispatches`"
    )
    expect(enabled).toContain("record the reminder receipt")
  })

  test("morning-off leaves future work to reminders", () => {
    const instructions = renderBriefing({
      morning: false,
      beforeMeeting: true,
      leadMinutes: "60",
    })

    expect(instructions).toContain(
      "With morning delivery off, leave future meetings to their reminders"
    )
    expect(instructions).toContain("start minus 60 minutes")
    expect(instructions).not.toContain("morning:<target UTC>")
  })

  test("meeting scope changes composition", () => {
    expect(renderBriefing()).toContain(
      "attendee outside the requester's organization"
    )
    expect(renderBriefing({ meetings: "internal" })).toContain(
      "Keep internal meetings where preparation could affect a decision"
    )
    expect(renderBriefing({ meetings: "both" })).toContain(
      "Keep every eligible external meeting and internal meeting"
    )
  })
})
