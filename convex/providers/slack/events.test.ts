import { describe, expect, test } from "vitest"
import { getSlackMessage } from "./events"

describe("Slack event messages", () => {
  test("normalizes Slack message data into channel and thread objects", () => {
    expect(
      getSlackMessage({
        type: "event_callback",
        team_id: "T123",
        event_id: "E123",
        event: {
          type: "message",
          user: "U123",
          channel: "C123",
          channel_type: "channel",
          text: "hello",
          ts: "1710000000.000200",
          thread_ts: "1710000000.000100",
          client_msg_id: "client-message",
        },
      })
    ).toMatchObject({
      type: "message.channels",
      conversationId: "1710000000.000100",
      data: {
        channel: { id: "C123", type: "channel" },
        event: { id: "E123" },
        thread: { ts: "1710000000.000100" },
        ts: "1710000000.000200",
      },
    })
  })

  test("preserves native Slack app mention events", () => {
    expect(
      getSlackMessage({
        type: "event_callback",
        team_id: "T123",
        event: {
          type: "app_mention",
          user: "U123",
          channel: "C123",
          text: "<@UBOT> hello",
          ts: "1710000000.000200",
        },
      })
    ).toMatchObject({ type: "app_mention" })
  })
})
