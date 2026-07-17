import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { summarizeCapabilityForConsole } from "./summary"

test("summarizes artifact capabilities by canonical tool surface", () => {
  expect(
    summarizeCapabilityForConsole({
      approvedAt: 1,
      integrationId: undefined,
      tool: "google_gmail_search_threads",
      versionId: undefined,
    })
  ).toEqual({
    access: "read",
    approvedAt: 1,
    description: "Search your Gmail threads.",
    integrationId: undefined,
    label: "Search threads",
    surface: "gmail",
    tool: "google_gmail_search_threads",
    versionId: undefined,
  })
})

test("preserves artifact capability integration scope metadata", () => {
  const integrationId = "integration" as Id<"integrations">
  const versionId = "version" as Id<"artifactVersions">

  expect(
    summarizeCapabilityForConsole({
      approvedAt: 1,
      integrationId,
      tool: "google_gmail_create_draft",
      versionId,
    })
  ).toMatchObject({
    access: "write",
    integrationId,
    surface: "gmail",
    versionId,
  })
})

test("omits unknown artifact capabilities from console summaries", () => {
  expect(
    summarizeCapabilityForConsole({
      approvedAt: 1,
      integrationId: undefined,
      tool: "unknown_tool",
      versionId: undefined,
    })
  ).toBeNull()
})
