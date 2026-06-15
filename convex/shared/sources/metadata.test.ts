import { expect, test } from "vitest"
import { createSourceMetadata } from "./metadata"

test("uses only the Slack channel", () => {
  expect(
    createSourceMetadata({
      provider: "slack",
      event: "message.created",
      data: {
        channel: { id: "C123", name: "support" },
        threadTs: "1710000000.000100",
        ts: "1710000000.000200",
      },
    })
  ).toEqual([{ type: "channel", label: "#support" }])
})

test("does not use Slack channel IDs as display metadata", () => {
  expect(
    createSourceMetadata({
      provider: "slack",
      event: "message.created",
      data: {
        channelId: "C123",
        ts: "1710000000.000200",
      },
    })
  ).toEqual([])
})

test("uses repository and issue for GitHub issue comments", () => {
  expect(
    createSourceMetadata({
      provider: "github",
      event: "issue.comment.created",
      data: {
        repository: {
          fullName: "vedin-labs/frontier",
          url: "https://github.com/vedin-labs/frontier",
        },
        issueNumber: 42,
        isPullRequest: false,
        issue: {
          number: 42,
          title: "Checkout error",
          url: "https://github.com/vedin-labs/frontier/issues/42",
        },
        comment: { id: "comment-id", path: "README.md" },
      },
    })
  ).toEqual([
    {
      type: "repository",
      label: "frontier",
      url: "https://github.com/vedin-labs/frontier",
    },
    {
      type: "issue",
      label: "#42: Checkout error",
      url: "https://github.com/vedin-labs/frontier/issues/42",
    },
  ])
})

test("uses repository and pull request for GitHub pull request comments", () => {
  expect(
    createSourceMetadata({
      provider: "github",
      event: "pull_request.review_comment.edited",
      data: {
        repository: { fullName: "vedin-labs/frontier" },
        pullNumber: 2,
        pullRequest: {
          number: 2,
          title: "Add description to README",
          url: "https://github.com/vedin-labs/frontier/pull/2",
        },
        comment: { id: "comment-id", path: "README.md" },
      },
    })
  ).toEqual([
    { type: "repository", label: "frontier" },
    {
      type: "pull_request",
      label: "#2: Add description to README",
      url: "https://github.com/vedin-labs/frontier/pull/2",
    },
  ])
})

test("uses project and issue for Linear issue comments", () => {
  expect(
    createSourceMetadata({
      provider: "linear",
      event: "issue.comment.created",
      data: {
        issueIdentifier: "ENG-214",
        issue: {
          title: "Checkout error",
          url: "https://linear.app/acme/issue/ENG-214/checkout-error",
          project: { name: "Payments" },
        },
        commentId: "comment-id",
      },
    })
  ).toEqual([
    { type: "project", label: "Payments" },
    {
      type: "issue",
      label: "ENG-214: Checkout error",
      url: "https://linear.app/acme/issue/ENG-214/checkout-error",
    },
  ])
})

test("uses page for Notion events", () => {
  expect(
    createSourceMetadata({
      provider: "notion",
      event: "page.updated",
      data: {
        pageId: "page-id",
        page: {
          id: "page-id",
          title: "Product roadmap",
          url: "https://notion.so/page-id",
        },
        workspaceName: "Workspace",
      },
    })
  ).toEqual([
    {
      type: "page",
      label: "Product roadmap",
      url: "https://notion.so/page-id",
    },
  ])
})

test("does not use Notion page IDs as display metadata", () => {
  expect(
    createSourceMetadata({
      provider: "notion",
      event: "page.updated",
      data: {
        pageId: "page-id",
        workspaceName: "Workspace",
      },
    })
  ).toEqual([])
})

test("uses subject and sender for incoming emails", () => {
  expect(
    createSourceMetadata({
      provider: "gmail",
      event: "message.received",
      data: {
        subject: "Enterprise trial question",
        from: { email: "jane@acme.com" },
      },
    })
  ).toEqual([
    { type: "subject", label: "Enterprise trial question" },
    { type: "sender", label: "jane@acme.com" },
  ])
})

test("uses event name for calendar events", () => {
  expect(
    createSourceMetadata({
      provider: "googleCalendar",
      event: "event.starting_soon",
      data: { event: { summary: "Design review" } },
    })
  ).toEqual([{ type: "event", label: "Design review" }])
})

test("uses folder and file for Google Drive events", () => {
  expect(
    createSourceMetadata({
      provider: "googleDrive",
      event: "folder.file.created",
      data: {
        folder: { name: "Finance" },
        file: { name: "invoice.pdf" },
      },
    })
  ).toEqual([
    { type: "folder", label: "Finance" },
    { type: "file", label: "invoice.pdf" },
  ])
})
