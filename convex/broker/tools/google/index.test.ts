import { afterEach, describe, expect, test, vi } from "vitest"
import {
  draftedMailSchema,
  sentMailSchema,
} from "../../../../contracts/tools/responses/mail"
import {
  createFileContext,
  mockJsonFetch,
} from "../../../../test/convex/broker"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { callGoogleTool } from "."

afterEach(() => vi.unstubAllGlobals())

test("sends a new Gmail message", async () => {
  const calls = mockJsonFetch(() => ({
    id: "sent-message",
    threadId: "thread",
  }))

  const result = await callGoogleTool(
    gmailIntegration(),
    "google_gmail_send_message",
    {
      bcc: ["audit@example.com"],
      body: "Hello from Jori",
      cc: ["team@example.com"],
      subject: "Hello",
      to: ["recipient@example.com"],
    }
  )

  expect(result).toEqual({
    status: "sent",
    messageId: "sent-message",
    threadId: "thread",
  })
  expect(schemaViolations(result, sentMailSchema())).toEqual([])
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
  )

  const raw = readRawMessage(calls[0]?.body)
  expect(raw).toContain("To: recipient@example.com")
  expect(raw).toContain("Cc: team@example.com")
  expect(raw).toContain("Bcc: audit@example.com")
  expect(raw).toContain("Subject: Hello")
  expect(raw).toContain("Content-Type: text/plain; charset=UTF-8")
  expect(raw).toContain("\r\n\r\nHello from Jori")
})

test("creates a Gmail draft", async () => {
  const calls = mockJsonFetch(() => ({
    id: "draft",
    message: { id: "message", threadId: "thread" },
  }))

  const result = await callGoogleTool(
    gmailIntegration(),
    "google_gmail_create_draft",
    {
      body: "<p>Hello from Jori</p>",
      bodyType: "HTML",
      subject: "Draft",
      to: ["recipient@example.com"],
    }
  )

  expect(result).toEqual({
    status: "drafted",
    draftId: "draft",
    messageId: "message",
    threadId: "thread",
  })
  expect(schemaViolations(result, draftedMailSchema())).toEqual([])
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
  )

  const raw = readRawMessage(calls[0]?.body, ["message", "raw"])
  expect(raw).toContain("To: recipient@example.com")
  expect(raw).toContain("Subject: Draft")
  expect(raw).toContain("Content-Type: text/html; charset=UTF-8")
  expect(raw).toContain("\r\n\r\n<p>Hello from Jori</p>")
})

test.each(["create_draft", "reply_to_thread"])(
  "Gmail %s uses thread headers and preserves its body and file support",
  async (tool) => {
    const draft = tool === "create_draft"
    const calls = mockGmailReply()

    const result = await callGoogleTool(
      gmailIntegration(),
      `google_gmail_${tool}`,
      {
        body: "<p>I will look into this.</p>",
        bodyType: "HTML",
        files: [{ fileId: "file-id" }],
        to: ["ignored@example.com"],
        cc: ["ignored@example.com"],
        bcc: ["ignored@example.com"],
        subject: "Ignored subject",
        threadId: "thread-1",
      },
      createFileContext()
    )

    expect(result).toEqual(
      draft
        ? { status: "drafted", draftId: "draft" }
        : { status: "sent", messageId: "sent-message" }
    )
    expect(calls.map((call) => call.url)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/threads/thread-1?format=metadata",
      `https://gmail.googleapis.com/gmail/v1/users/me/${draft ? "drafts" : "messages/send"}`,
    ])
    expect(calls[1]?.body).toMatchObject(
      draft ? { message: { threadId: "thread-1" } } : { threadId: "thread-1" }
    )

    const raw = readRawMessage(
      calls[1]?.body,
      draft ? ["message", "raw"] : ["raw"]
    )
    expect(raw).toContain("To: client@example.com")
    expect(raw).toContain("Subject: Re: Question")
    expect(raw).toContain("In-Reply-To: <message-1>")
    expect(raw).toContain("References: <root> <message-1>")
    expect(raw).not.toContain("ignored@example.com")
    expect(raw).not.toContain("Ignored subject")
    expect(raw).toContain(
      `Content-Type: text/${draft ? "html" : "plain"}; charset=UTF-8`
    )
    expect(raw).toContain("\r\n\r\n<p>I will look into this.</p>")
    expect(
      raw.includes('Content-Disposition: attachment; filename="kitten.png"')
    ).toBe(draft)
    expect(raw.includes("multipart/mixed")).toBe(draft)
  }
)

describe("Gmail files", () => {
  test.each(["send_message", "create_draft"])(
    "%s includes saved files",
    async (tool) => {
      const draft = tool === "create_draft"
      const calls = mockJsonFetch(() => ({
        id: draft ? "draft" : "sent-message",
      }))

      const result = await callGoogleTool(
        gmailIntegration(),
        `google_gmail_${tool}`,
        {
          files: [{ fileId: "file-id" }],
          body: "See attached.",
          subject: "File",
          to: ["recipient@example.com"],
        },
        createFileContext()
      )

      expect(result).toEqual(
        draft
          ? { status: "drafted", draftId: "draft" }
          : { status: "sent", messageId: "sent-message" }
      )
      const message = draft
        ? (calls[0]?.body as { message?: unknown } | undefined)?.message
        : calls[0]?.body
      expect(message).not.toHaveProperty("threadId")
      const raw = readRawMessage(message)

      expect(raw).toContain("Content-Type: multipart/mixed; boundary=")
      expect(raw).toContain("Content-Type: text/plain; charset=UTF-8")
      expect(raw).toContain("See attached.")
      expect(raw).toContain('Content-Type: image/png; name="kitten.png"')
      expect(raw).toContain(
        'Content-Disposition: attachment; filename="kitten.png"'
      )
      expect(raw).toContain("aGVsbG8=")
    }
  )

  test.each(["send_message", "create_draft"])(
    "%s validates message fields before reading files",
    async (tool) => {
      const calls = mockJsonFetch(() => ({}))

      await expect(
        callGoogleTool(gmailIntegration(), `google_gmail_${tool}`, {
          to: ["recipient@example.com"],
          subject: "File",
          body: "",
          files: "invalid",
        })
      ).rejects.toThrow("body is required")
      expect(calls).toHaveLength(0)
    }
  )
})

function readRawMessage(body: unknown, path: string[] = ["raw"]) {
  const raw = path.reduce<unknown>((value, key) => {
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)[key]
      : undefined
  }, body)

  expect(raw).toEqual(expect.any(String))

  return Buffer.from(String(raw), "base64url").toString("utf8")
}

function gmailIntegration() {
  return { ...integration("gmail"), email: "sender@example.com" }
}

function mockGmailReply() {
  return mockJsonFetch((url) => {
    if (url.pathname.endsWith("/drafts")) {
      return { id: "draft" }
    }
    if (url.pathname.endsWith("/send")) {
      return { id: "sent-message" }
    }
    return {
      messages: [
        {
          internalDate: "1",
          payload: {
            headers: [
              { name: "From", value: "Client <client@example.com>" },
              { name: "To", value: "sender@example.com" },
              { name: "Subject", value: "Question" },
              { name: "Message-Id", value: "<message-1>" },
              { name: "References", value: "<root>" },
            ],
          },
        },
      ],
    }
  })
}
