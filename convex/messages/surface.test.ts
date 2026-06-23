import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import {
  messageActorIds,
  messageAudience,
  messageIds,
  messageText,
  replyAddress,
} from "./surface"

describe("message surface text", () => {
  test("replaces Milo's Slack mention with a readable name", () => {
    expect(
      messageText(
        message({
          text: "<@U0B96KZ7WJG> hello <@UOTHER>",
        }),
        integration({ data: { botUserId: "U0B96KZ7WJG" } })
      )
    ).toBe("@Milo hello <@UOTHER>")
  })

  test("handles Slack mention labels", () => {
    expect(
      messageText(
        message({
          text: "<@U0B96KZ7WJG|milo> hello",
        }),
        integration({ data: { botUserId: "U0B96KZ7WJG" } })
      )
    ).toBe("@Milo hello")
  })

  test("exposes Slack actor and message identifiers when available", () => {
    expect(
      messageActorIds(
        message({
          actor: { externalId: "U123", kind: "user", name: "Albin" },
        })
      )
    ).toEqual(["slack:user:U123"])
    expect(messageIds(message({ data: { ts: "1782231485.491049" } }))).toEqual([
      "slack:message:1782231485.491049",
    ])
  })
})

describe("message surface addressing", () => {
  test("detects GitHub and Linear Milo mentions", () => {
    expect(
      messageAudience(
        message({ integration: "github", mentioned: true }),
        integration({})
      )
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(
        message({ integration: "linear", mentioned: true }),
        integration({})
      )
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(
        message({ integration: "github", text: "Follow-up for Milo" }),
        integration({})
      )
    ).toMatchObject({ isAddressed: false, isDirect: false })
  })

  test("treats Slack mentions and direct messages as addressed separately", () => {
    expect(
      messageAudience(
        message({ mentioned: true, type: "message.channels" }),
        integration({})
      )
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(message({ type: "message.im" }), integration({}))
    ).toMatchObject({ isAddressed: true, isDirect: true })
  })

  test("resolves GitHub and Linear reply targets", () => {
    expect(
      replyAddress(
        message({
          integration: "github",
          data: {
            repository: { fullName: "acme/app" },
            issueNumber: 12,
          },
        })
      )
    ).toEqual({
      type: "github",
      kind: "issue",
      owner: "acme",
      repo: "app",
      issueNumber: 12,
    })
    expect(
      replyAddress(
        message({ integration: "linear", data: { issueId: "ISS-1" } })
      )
    ).toEqual({ type: "linear", issueId: "ISS-1" })
  })
})

function message(overrides: Partial<Doc<"messages">>) {
  return {
    integration: "slack",
    mentioned: false,
    text: "",
    type: "message.channels",
    ...overrides,
  } as Doc<"messages">
}

function integration(overrides: Partial<Doc<"integrations">>) {
  return {
    data: {},
    ...overrides,
  } as Doc<"integrations">
}
