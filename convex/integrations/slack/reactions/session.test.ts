import { expect, test } from "vitest"
import { type ReactionSnapshotTarget } from "../../../reactions/data"
import { applySlackReactionProfiles } from "./session"

test("applies Slack profile names to reaction actors", () => {
  expect(
    applySlackReactionProfiles(
      [target()],
      new Map([["U123", { name: "Albin" }]])
    )
  ).toEqual([
    {
      reactions: [
        {
          actor: {
            externalId: "U123",
            kind: "person",
            name: "Albin",
          },
          reaction: ":eyes:",
        },
        {
          actor: {
            externalId: "U456",
            kind: "person",
          },
          reaction: ":white_check_mark:",
        },
      ],
      target: {
        identifiers: ["slack:message:1710000000.000100"],
        key: "slack:message:C123:1710000000.000100",
      },
    },
  ])
})

function target(): ReactionSnapshotTarget {
  return {
    reactions: [
      {
        actor: {
          externalId: "U123",
          kind: "person",
        },
        reaction: ":eyes:",
      },
      {
        actor: {
          externalId: "U456",
          kind: "person",
        },
        reaction: ":white_check_mark:",
      },
    ],
    target: {
      identifiers: ["slack:message:1710000000.000100"],
      key: "slack:message:C123:1710000000.000100",
    },
  }
}
