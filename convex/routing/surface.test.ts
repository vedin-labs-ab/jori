import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { routingMessageText } from "./surface"

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
