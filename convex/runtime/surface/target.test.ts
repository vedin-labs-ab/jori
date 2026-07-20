import { expect, test } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { resolveReactionAddress } from "./target"

test("resolves a Slack reaction target from visible message metadata", async () => {
  await expect(
    resolveReactionAddress(
      fakeQueryCtx([
        message({
          data: { channel: { id: "C123" }, ts: "999.000" },
        }),
      ]),
      message({ data: { channel: { id: "C123" }, ts: "123.456" } }),
      { messageTs: "999.000" }
    )
  ).resolves.toEqual({
    channel: "C123",
    timestamp: "999.000",
    type: "slack",
  })
})

test("resolves Linear comment and issue reaction targets", async () => {
  const trigger = message({
    conversationId: "issue-id",
    data: { issueId: "issue-id" },
    integration: "linear",
  })

  await expect(
    resolveReactionAddress(
      fakeQueryCtx([
        message({
          conversationId: "issue-id",
          data: { commentId: "comment-id", issueId: "issue-id" },
          integration: "linear",
        }),
      ]),
      trigger,
      { type: "comment", commentId: "comment-id" }
    )
  ).resolves.toEqual({
    target: { id: "comment-id", type: "comment" },
    type: "linear",
  })
  await expect(
    resolveReactionAddress(fakeQueryCtx([]), trigger, {
      type: "issue",
      issueId: "issue-id",
    })
  ).resolves.toEqual({
    target: { id: "issue-id", type: "issue" },
    type: "linear",
  })
})

test("resolves GitHub comment reaction subject from comment kind", async () => {
  await expect(
    resolveReactionAddress(
      fakeQueryCtx([]),
      message({
        data: {
          repository: { fullName: "acme/app" },
          comment: { id: "456", kind: "pull_request_review" },
        },
        integration: "github",
      }),
      { type: "comment", commentId: 456 }
    )
  ).resolves.toEqual({
    commentId: 456,
    owner: "acme",
    repo: "app",
    subject: "pull_request_review_comment",
    type: "github",
  })
})

test("rejects reaction targets outside the visible conversation", async () => {
  await expect(
    resolveReactionAddress(
      fakeQueryCtx([]),
      message({ data: { channel: { id: "C123" }, ts: "123.456" } }),
      { messageTs: "999.000" }
    )
  ).resolves.toBeNull()
})

function fakeQueryCtx(messages: Doc<"messages">[]) {
  return {
    db: {
      query: () => ({
        withIndex: () => ({
          order: () => ({
            take: async () => messages,
          }),
        }),
      }),
    },
  } as unknown as QueryCtx
}

function message(overrides: Partial<Doc<"messages">>) {
  return {
    _id: "message",
    _creationTime: 0,
    organizationId: "organization",
    integrationId: "integration",
    integration: "slack",
    type: "message.channels",
    externalId: "external",
    mentioned: false,
    conversationId: "conversation",
    data: {},
    createdAt: 0,
    ...overrides,
  } as Doc<"messages">
}
