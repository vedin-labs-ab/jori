import { describe, expect, test } from "vitest"
import {
  emailDestination,
  renderPlaybook,
} from "../../../../test/convex/playbooks"

const renderBriefing = (
  options: Record<string, boolean | number | string> = {}
) => renderPlaybook("meeting-briefing", emailDestination, options)

describe("Meeting Briefing contract", () => {
  test.each([
    "#start_agent",
    "#wait_for_agents",
    "#add_automation",
    "#update_app_state",
    "#share_app",
  ])("uses the %s reference", (reference) => {
    expect(renderBriefing()).toContain(reference)
  })

  test("defines complete, actionable coverage", () => {
    const instructions = renderBriefing()

    expect(instructions).toContain("Scan every calendar I can read")
    expect(instructions).toContain(
      "every occurrence of recurring meetings included"
    )
    expect(instructions).toContain("from now through the next 26 hours")
    expect(instructions).toContain("Cover up to 60 meetings")
    expect(instructions).toContain("state the gap if more qualify")
    expect(instructions).toContain(
      "at least one item that changes what I should decide, ask, say, notice, or do"
    )
    expect(instructions).toContain(
      "Every other eligible meeting gets a sparse or partial briefing"
    )
    expect(instructions).toContain(
      "even when research is thin or a child failed"
    )
  })

  test("draws the sensitivity boundary at personal, not professional", () => {
    const instructions = renderBriefing()

    expect(instructions).toContain("confidential professional meetings")
    expect(instructions).toContain(
      "board and investor meetings, commercial negotiations, recruiting interviews, customer escalations"
    )
    expect(instructions).toContain("medical or therapy appointments")
    expect(instructions).toContain("disciplinary, termination, harassment")
    expect(instructions).toContain(
      "Remove a stored meeting that turns out to be one of these"
    )
  })
})

describe("Meeting Briefing placement", () => {
  test.each([
    "untrusted",
    "SHA-256",
    "`bash`",
    "expectedVersion",
    "256 KiB",
    "schemaVersion",
    "Try once",
    "mb:",
    "`gaps`",
    "`truncated`",
    "`queued`",
    "researching",
    "preparedForContentHash",
  ])("keeps platform-owned %s out of the recipe", (token) => {
    expect(renderBriefing({ beforeMeeting: true })).not.toContain(token)
  })
})

describe("Meeting Briefing state and evidence", () => {
  test("builds identity on broker-stamped keys", () => {
    const instructions = renderBriefing({ beforeMeeting: true })

    expect(instructions).toContain(
      "Track each meeting under its event's `entityKey`"
    )
    expect(instructions).toContain("presentable, source-cited facts")
    expect(instructions).toContain("preparation for an outdated hash is stale")
    expect(instructions).toContain("a failed read is a gap, not a cancellation")
  })

  test("keeps fenced instructions standalone on contentHash staleness", () => {
    expect(
      renderBriefing().match(
        /stale when (?:an|the) event's `contentHash` changed/g
      )
    ).toHaveLength(1)
    expect(
      renderBriefing({ beforeMeeting: true }).match(
        /stale when (?:an|the) event's `contentHash` changed/g
      )
    ).toHaveLength(2)
  })
})

describe("Meeting Briefing coordination", () => {
  test("isolates delegated evidence and handles failed work", () => {
    const instructions = renderBriefing()

    expect(instructions).toContain("Deep-research up to 20")
    expect(instructions).toContain("granting only email reading and web access")
    expect(instructions).toContain("Meeting state is written by this run alone")
    expect(instructions.match(/one #wait_for_agents call/g)).toHaveLength(1)
    expect(instructions).toContain(
      "accept a result only if its meeting is unchanged"
    )
    expect(instructions).toContain(
      "count a failed, timed-out, or mismatched child as an explicit gap"
    )
  })
})

describe("Meeting Briefing delivery", () => {
  test("closes the target race and exact-boundary hole", () => {
    const instructions = renderBriefing()

    expect(instructions).toContain(
      "starts strictly after that target and ends at the next local day's target, inclusive"
    )
    expect(instructions).toContain(
      "A still-upcoming meeting at or before today's target belongs to the prior window"
    )
    expect(instructions).toContain("morning-retry:<target UTC>")
    expect(instructions).toContain("no later than 20 minutes after the target")
    expect(instructions).toContain(
      "continue with what is verified and note the missing coverage once"
    )
  })

  test("claims delivery before sending to prevent duplicates", () => {
    const instructions = renderBriefing()

    expect(instructions).toContain(
      "Claim the key `morning:<parent automation ID>:<target UTC>` in `dispatches`"
    )
    expect(instructions).toContain(
      "after claiming the key `manual:<run ID>` in `dispatches`"
    )
    expect(instructions).toContain("mark an abandoned claim `unknown`")
    expect(instructions).toContain("a receipt requires confirmed success")
  })
})
