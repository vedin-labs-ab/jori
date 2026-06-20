import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { messageAudience, replyAddress, routingMessageText } from "./surface"

describe("routing surface text", () => {
  test("replaces Milo's Slack mention with a readable name", () => {
    expect(
      routingMessageText(
        message({
          text: "<@U0B96KZ7WJG> hello <@UOTHER>",
        }),
        integration({ data: { botId: "U0B96KZ7WJG" } })
      )
    ).toBe("@Milo hello <@UOTHER>")
  })

  test("handles Slack mention labels", () => {
    expect(
      routingMessageText(
        message({
          text: "<@U0B96KZ7WJG|milo> hello",
        }),
        integration({ data: { botId: "U0B96KZ7WJG" } })
      )
    ).toBe("@Milo hello")
  })
})

describe("routing surface addressing", () => {
  test("detects GitHub and Linear Milo mentions", () => {
    expect(
      messageAudience(
        message({ integration: "github", text: "@milo please check" }),
        integration({})
      )
    ).toMatchObject({ isAddressed: true, isDirect: false })
    expect(
      messageAudience(
        message({ integration: "linear", text: "Follow-up for @Milo" }),
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
    text: "",
    ...overrides,
  } as Doc<"messages">
}

function integration(overrides: Partial<Doc<"integrations">>) {
  return {
    data: {},
    ...overrides,
  } as Doc<"integrations">
}
