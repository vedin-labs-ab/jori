import { expect, test } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { type PassInput, type RosterEntry } from "../input"
import { toJudgePayload } from "./judge"

function entry(id: string, name: string, anchors: string[]): RosterEntry {
  return {
    id: id as Id<"beliefs">,
    name,
    aliases: [],
    status: "confirmed",
    brief: "Brief.",
    anchors,
    seenAt: Date.UTC(2026, 5, 1),
    locked: false,
    journal: [],
  }
}

function passInput(roster: RosterEntry[]): PassInput {
  return {
    window: { start: Date.UTC(2026, 5, 1), end: Date.UTC(2026, 5, 2) },
    roster,
    events: [],
    conversations: [],
  }
}

test("names anchors that appear on several workstreams", () => {
  const payload = toJudgePayload(
    passInput([
      entry("a", "Payments revamp", ["github:acme/api", "linear-project:pay"]),
      entry("b", "SOC 2 push", ["github:acme/api", "slack-channel:C1"]),
    ])
  )

  expect(payload.sharedAnchors).toEqual(["github:acme/api"])
})

test("repeat anchors on one workstream stay out of the shared list", () => {
  const payload = toJudgePayload(
    passInput([
      entry("a", "Payments revamp", ["github:acme/api", "github:acme/api"]),
      entry("b", "SOC 2 push", ["slack-channel:C1"]),
    ])
  )

  expect(payload.sharedAnchors).toEqual([])
})
