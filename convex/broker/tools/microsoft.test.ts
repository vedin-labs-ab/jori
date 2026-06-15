import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { artifactContext } from "./fixtures/artifacts"
import { callMicrosoftTool } from "./microsoft"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("Outlook email tools", () => {
  test("sends artifact attachments as Graph file attachments", async () => {
    const calls = mockMicrosoftFetch(null)

    const result = await callMicrosoftTool(
      microsoftEmailIntegration(),
      "microsoft_email_send_message",
      {
        attachments: [{ artifactId: "artifact-id" }],
        body: "See attached.",
        subject: "Artifact",
        to: ["recipient@example.com"],
      },
      artifactContext()
    )

    expect(result).toBe("sent")
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/me/sendMail")
    expect(calls[0]?.body).toMatchObject({
      message: {
        subject: "Artifact",
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: "kitten.png",
            contentType: "image/png",
            contentBytes: "aGVsbG8=",
          },
        ],
      },
      saveToSentItems: true,
    })
  })
})

function mockMicrosoftFetch(responseBody: unknown) {
  const calls: Array<{ body: unknown; url: string }> = []

  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      url: String(url),
    })

    return Response.json(responseBody)
  })

  return calls
}

function microsoftEmailIntegration(): Doc<"integrations"> {
  return {
    _id: "microsoft-email-integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "microsoftEmail",
    scope: "user",
    ownerId: "user",
    externalId: "microsoft-account",
    email: "sender@example.com",
    credentials: {
      tokens: { access: "access-token", refresh: "refresh-token" },
      expiresAt: Date.now() + 60_000,
      tenantId: "microsoft-tenant",
    },
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
