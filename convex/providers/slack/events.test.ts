import { describe, expect, test } from "vitest"
import { getSlackMessage, getSlackReaction } from "./events"

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
      mentioned: false,
      conversationId: "1710000000.000100",
      data: {
        channel: { id: "C123" },
        event: { id: "E123" },
        thread: { ts: "1710000000.000100" },
        ts: "1710000000.000200",
      },
    })
  })

  test("stores native Slack app mentions as message types", () => {
    expect(
      getSlackMessage({
        type: "event_callback",
        team_id: "T123",
        event: {
          type: "app_mention",
          user: "U123",
          channel: "C123",
          channel_type: "channel",
          text: "<@UBOT> hello",
          ts: "1710000000.000200",
        },
      })
    ).toMatchObject({ mentioned: true, type: "message.channels" })
  })
})

describe("Slack event reactions", () => {
  test("normalizes message reaction events", () => {
    expect(
      getSlackReaction({
        type: "event_callback",
        team_id: "T123",
        event_id: "E123",
        event: {
          type: "reaction_added",
          user: "U123",
          item_user: "UBOT",
          reaction: "white_check_mark",
          event_ts: "1710000001.000000",
          item: {
            type: "message",
            channel: "C123",
            ts: "1710000000.000200",
          },
        },
      })
    ).toMatchObject({
      action: "added",
      actorId: "U123",
      reaction: ":white_check_mark:",
      target: {
        key: "slack:message:C123:1710000000.000200",
        identifiers: ["slack:channel:C123", "slack:message:1710000000.000200"],
        actorId: "UBOT",
        conversationId: "1710000000.000200",
      },
    })
  })
})

describe("Slack event actor aliases", () => {
  test("stores Slack bot event ids as actor aliases", () => {
    const message = getSlackMessage({
      type: "event_callback",
      team_id: "T123",
      event: {
        type: "message",
        user: "U123",
        bot_id: "B123",
        channel: "C123",
        channel_type: "channel",
        text: "hello from the bot",
        ts: "1710000000.000200",
      },
    })

    expect(message).toMatchObject({
      actorAliases: [{ type: "slack.bot", id: "B123" }],
      actorId: "U123",
    })
    expect(message?.data).toEqual({
      channel: { id: "C123" },
      ts: "1710000000.000200",
    })
  })

  test("uses an unknown message type when Slack omits the channel kind", () => {
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
    ).toMatchObject({ mentioned: true, type: "message.unknown" })
  })
})
