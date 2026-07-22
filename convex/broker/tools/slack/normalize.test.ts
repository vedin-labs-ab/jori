import { describe, expect, test } from "vitest"
import { schemaViolations } from "../../../../test/convex/schema"
import { slackToolResponseSchemas } from "../../../runs/agent/tools/schemas/responses/slack"
import {
  slackChannelListing,
  slackMemberListing,
  slackMessageListing,
  slackSearchListing,
} from "./normalize"

describe("Slack message normalization", () => {
  test("message listings reduce to normalized messages", () => {
    const result = slackMessageListing({
      ok: true,
      has_more: true,
      messages: [
        {
          ts: "200.1",
          thread_ts: "100.1",
          user: "U1",
          text: "On it",
          client_msg_id: "noise",
          team: "T1",
          reactions: [{ name: "eyes", count: 2, users: ["U2", "U3"] }],
          reply_count: 3,
          edited: { user: "U1", ts: "201.0" },
        },
        { ts: "100.1", bot_id: "B1", subtype: "bot_message", text: "Report" },
      ],
    })

    expect(result).toEqual({
      hasMore: true,
      messages: [
        {
          ts: "200.1",
          threadTs: "100.1",
          userId: "U1",
          text: "On it",
          reactions: [{ name: "eyes", count: 2 }],
          replyCount: 3,
          edited: true,
        },
        { ts: "100.1", botId: "B1", subtype: "bot_message", text: "Report" },
      ],
    })
    expect(
      schemaViolations(result, slackToolResponseSchemas.conversations_history)
    ).toEqual([])
  })
})

describe("Slack channel normalization", () => {
  test("channel listings classify conversation types", () => {
    const result = slackChannelListing({
      ok: true,
      channels: [
        {
          id: "C1",
          name: "general",
          is_channel: true,
          is_private: false,
          topic: { value: "Company wide" },
          num_members: 12,
        },
        { id: "G1", name: "leads", is_private: true },
        { id: "D1", is_im: true, user: "U9" },
      ],
      response_metadata: { next_cursor: "cursor-1" },
    })

    expect(result).toEqual({
      channels: [
        {
          channelId: "C1",
          name: "general",
          type: "public_channel",
          topic: "Company wide",
          memberCount: 12,
        },
        { channelId: "G1", name: "leads", type: "private_channel" },
        { channelId: "D1", type: "im", userId: "U9" },
      ],
      nextCursor: "cursor-1",
    })
    expect(
      schemaViolations(result, slackToolResponseSchemas.channels_list)
    ).toEqual([])
  })
})

describe("Slack member and search normalization", () => {
  test("member listings keep profile fields and drop empty cursors", () => {
    const result = slackMemberListing({
      ok: true,
      members: [
        {
          id: "U1",
          name: "albin",
          real_name: "Albin Vedin",
          profile: { display_name: "albin", email: "albin@example.com" },
          tz: "Europe/Stockholm",
        },
        { id: "B1", name: "milo", is_bot: true, deleted: true },
      ],
      response_metadata: { next_cursor: "" },
    })

    expect(result).toEqual({
      members: [
        {
          userId: "U1",
          name: "albin",
          realName: "Albin Vedin",
          displayName: "albin",
          email: "albin@example.com",
          timeZone: "Europe/Stockholm",
        },
        { userId: "B1", name: "milo", isBot: true, deleted: true },
      ],
    })
    expect(
      schemaViolations(result, slackToolResponseSchemas.users_search)
    ).toEqual([])
  })
})

describe("Slack search normalization", () => {
  test("search results carry their conversation and permalink", () => {
    const result = slackSearchListing({
      ok: true,
      messages: {
        total: 41,
        paging: { count: 20, total: 41, page: 1, pages: 3 },
        matches: [
          {
            ts: "300.1",
            text: "launch plan",
            user: "U1",
            channel: { id: "C1", name: "general" },
            permalink: "https://example.slack.com/archives/C1/p3001",
          },
        ],
      },
    })

    expect(result).toEqual({
      matches: [
        {
          ts: "300.1",
          text: "launch plan",
          userId: "U1",
          channelId: "C1",
          channelName: "general",
          permalink: "https://example.slack.com/archives/C1/p3001",
        },
      ],
      totalCount: 41,
      page: 1,
      pageCount: 3,
    })
    expect(
      schemaViolations(
        result,
        slackToolResponseSchemas.conversations_search_messages
      )
    ).toEqual([])
  })
})
