import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc } from "../../../_generated/dataModel"
import { artifactContext } from "../fixtures/artifacts"
import { callSlackTool } from "."

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

describe("Slack file uploads", () => {
  test("uploads artifact attachments as Slack files", async () => {
    const calls = mockSlackFetch([
      {
        ok: true,
        upload_url: "https://files.slack.com/upload/v1/TICKET",
        file_id: "F123",
      },
      new Response(""),
      {
        ok: true,
        files: [{ id: "F123", title: "kitten.png" }],
      },
    ])

    const result = await callSlackTool(
      slackIntegration(),
      "conversations_add_message",
      {
        attachments: [{ artifactId: "artifact-id" }],
        channel: "C123",
        text: "Here is the image.",
        thread_ts: "123.456",
      },
      artifactContext()
    )

    expect(result).toEqual({
      ok: true,
      files: [{ id: "F123", title: "kitten.png" }],
    })
    expect(calls).toHaveLength(3)
    expect(calls[0]).toMatchObject({
      body: {
        alt_txt: "A small generated image.",
        filename: "kitten.png",
        length: "5",
      },
      headers: { "content-type": "application/x-www-form-urlencoded" },
      url: "https://slack.com/api/files.getUploadURLExternal",
    })
    expect(calls[1]).toMatchObject({
      headers: { "content-type": "image/png" },
      method: "POST",
      url: "https://files.slack.com/upload/v1/TICKET",
    })
    expect(calls[1]?.body).toBeInstanceOf(Blob)
    expect(
      new Uint8Array(await (calls[1]?.body as Blob).arrayBuffer())
    ).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
    expect(calls[2]).toMatchObject({
      body: {
        channel_id: "C123",
        files: [{ id: "F123", title: "kitten.png" }],
        initial_comment: "Here is the image.",
        thread_ts: "123.456",
      },
      url: "https://slack.com/api/files.completeUploadExternal",
    })
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

function mockSlackFetch(
  responseBody: unknown | Response | Array<unknown | Response>
) {
  const calls: Array<{
    body: unknown
    headers: Record<string, string>
    method: string | undefined
    params: Record<string, string>
    url: string
  }> = []
  const responses = Array.isArray(responseBody) ? [...responseBody] : undefined

  globalThis.fetch = vi.fn(async (url, init) => {
    const parsedUrl = new URL(String(url))

    calls.push({
      body: parseSlackRequestBody(init?.body),
      headers: (init?.headers ?? {}) as Record<string, string>,
      method: init?.method,
      params: Object.fromEntries(parsedUrl.searchParams.entries()),
      url: `${parsedUrl.origin}${parsedUrl.pathname}`,
    })

    const response = responses?.shift() ?? responseBody

    return response instanceof Response ? response : Response.json(response)
  })

  return calls
}

function parseSlackRequestBody(body: BodyInit | null | undefined) {
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries())
  }

  return typeof body === "string" ? JSON.parse(body) : body
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
