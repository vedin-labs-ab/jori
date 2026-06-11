import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { callSlackTool } from "./slack"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("Slack message tool", () => {
  test("forwards Block Kit blocks with the text fallback", async () => {
    const calls = mockSlackFetch({ ok: true, ts: "111.222" })
    const blocks = [
      { type: "header", text: { type: "plain_text", text: "Report" } },
    ]

    const result = await callSlackTool(
      slackIntegration(),
      "conversations_add_message",
      {
        channel: "C123",
        text: "Report summary",
        thread_ts: "123.456",
        blocks,
      }
    )

    expect(result).toEqual({ ok: true, ts: "111.222" })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("https://slack.com/api/chat.postMessage")
    expect(calls[0]?.method).toBe("POST")
    expect(calls[0]?.headers).toMatchObject({
      authorization: "Bearer bot-token",
      "content-type": "application/json; charset=utf-8",
    })
    expect(calls[0]?.body).toMatchObject({
      channel: "C123",
      text: "Report summary",
      thread_ts: "123.456",
      blocks,
    })
  })

  test("omits empty blocks", async () => {
    const calls = mockSlackFetch({ ok: true, ts: "111.222" })

    await callSlackTool(slackIntegration(), "conversations_add_message", {
      channel: "C123",
      text: "Hello",
      blocks: [],
    })

    expect(calls[0]?.body).not.toHaveProperty("blocks")
  })

  test("rejects malformed blocks", async () => {
    mockSlackFetch({ ok: true })

    await expect(
      callSlackTool(slackIntegration(), "conversations_add_message", {
        channel: "C123",
        text: "Hello",
        blocks: ["not-a-block"],
      })
    ).rejects.toThrow("blocks must be an array of Block Kit block objects")
  })
})

describe("Slack read tools", () => {
  test("reads thread replies with query parameters", async () => {
    const calls = mockSlackFetch({ ok: true, messages: [] })

    const result = await callSlackTool(
      slackIntegration(),
      "conversations_replies",
      {
        channel: "C123",
        ts: "123.456",
        limit: 10,
      }
    )

    expect(result).toEqual({ ok: true, messages: [] })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("https://slack.com/api/conversations.replies")
    expect(calls[0]?.method).toBe("GET")
    expect(calls[0]?.headers).toMatchObject({
      authorization: "Bearer user-token",
    })
    expect(calls[0]?.body).toBeUndefined()
    expect(calls[0]?.params).toMatchObject({
      channel: "C123",
      limit: "10",
      ts: "123.456",
    })
  })

  test("searches messages with query parameters", async () => {
    const calls = mockSlackFetch({ ok: true, messages: { matches: [] } })

    await callSlackTool(slackIntegration(), "conversations_search_messages", {
      query: "stilla",
      count: 5,
      page: 2,
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("https://slack.com/api/search.messages")
    expect(calls[0]?.method).toBe("GET")
    expect(calls[0]?.body).toBeUndefined()
    expect(calls[0]?.params).toMatchObject({
      count: "5",
      page: "2",
      query: "stilla",
    })
  })
})

function mockSlackFetch(responseBody: unknown) {
  const calls: Array<{
    body: unknown
    headers: Record<string, string>
    method: string | undefined
    params: Record<string, string>
    url: string
  }> = []

  globalThis.fetch = vi.fn(async (url, init) => {
    const parsedUrl = new URL(String(url))

    calls.push({
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      headers: (init?.headers ?? {}) as Record<string, string>,
      method: init?.method,
      params: Object.fromEntries(parsedUrl.searchParams.entries()),
      url: `${parsedUrl.origin}${parsedUrl.pathname}`,
    })

    return Response.json(responseBody)
  })

  return calls
}

function slackIntegration(): Doc<"integrations"> {
  return {
    _id: "slack-integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "slack",
    scope: "tenant",
    externalId: "slack-account",
    credentials: {
      bot: "bot-token",
      user: "user-token",
    },
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
