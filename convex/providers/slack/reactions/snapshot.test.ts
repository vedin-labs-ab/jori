import { afterEach, expect, test, vi } from "vitest"
import { fetchSlackReactionSnapshots } from "./snapshot"

afterEach(() => {
  vi.restoreAllMocks()
})

test("normalizes Slack thread reactions into reaction snapshots", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        ok: true,
        messages: [
          {
            ts: "1710000000.000100",
            reactions: [
              {
                name: "white_check_mark",
                users: ["U123"],
              },
              {
                name: "eyes",
                users: ["U123", "U456"],
              },
            ],
          },
        ],
      })
    )
  )

  await expect(
    fetchSlackReactionSnapshots("token", {
      channelId: "C123",
      threadTs: "1710000000.000100",
    })
  ).resolves.toEqual([
    {
      reactions: [
        {
          actor: {
            externalId: "U123",
            kind: "person",
          },
          reaction: ":white_check_mark:",
        },
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
          reaction: ":eyes:",
        },
      ],
      target: {
        identifiers: ["slack:channel:C123", "slack:message:1710000000.000100"],
        key: "slack:message:C123:1710000000.000100",
      },
    },
  ])

  expect(fetch).toHaveBeenCalledWith(
    "https://slack.com/api/conversations.replies?channel=C123&limit=100&ts=1710000000.000100",
    expect.objectContaining({
      headers: expect.objectContaining({
        authorization: "Bearer token",
      }),
      method: "GET",
    })
  )
})
