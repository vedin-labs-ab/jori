import { expect, test } from "vitest"
import {
  createMentionCatalog,
  type MentionSources,
  mentionOptions,
  suggestMentions,
} from "./sources"

const sources: MentionSources = {
  integrations: ["slack", "googleCalendar"],
  resources: [
    { kind: "table", id: "t1", name: "Customer renewals" },
    { kind: "chat", id: "c1", name: "Renewal reminders" },
    { kind: "run", id: "r1", name: "Chase the unpaid renewals" },
    { kind: "file", id: "f1", name: "renewals-2026.csv" },
    { kind: "folder", id: "d1", name: "Renewals" },
    { kind: "store", id: "s1", name: "Renewal settings" },
    { kind: "job", id: "j1", name: "Renewals digest" },
    { kind: "job", id: "j2", name: "Payroll" },
  ],
  skills: ["triage", "release-notes"],
  tools: [
    { label: "Search files", surface: "jori", tool: "search_files" },
    {
      label: "Send message",
      surface: "slack",
      tool: "conversations_add_message",
    },
  ],
}

test("each sigil suggests its own kind, names starting with the query first, six at most", () => {
  expect(
    suggestMentions({ kind: "resource", query: "ren" }, sources).map(
      (item) => item.label
    )
  ).toEqual([
    "Renewal reminders",
    "Renewal settings",
    "Renewals",
    "Renewals digest",
    "renewals-2026.csv",
    "Chase the unpaid renewals",
  ])
  expect(
    suggestMentions({ kind: "resource", query: "" }, sources)
  ).toHaveLength(6)
  expect(suggestMentions({ kind: "skill", query: "rel" }, sources)).toEqual([
    { id: "release-notes", kind: "skill", label: "release-notes" },
  ])
  expect(suggestMentions({ kind: "tool", query: "add" }, sources)).toEqual([
    {
      id: "conversations_add_message",
      kind: "tool",
      label: "conversations_add_message",
      surface: "slack",
    },
  ])
  expect(
    suggestMentions({ kind: "integration", query: "goog" }, sources)
  ).toEqual([
    {
      id: "googleCalendar",
      kind: "integration",
      label: "Google Calendar",
      surface: "googleCalendar",
    },
  ])
})

test("a resource suggestion carries its target and its kind's noun", () => {
  expect(mentionOptions("resource", sources)[0]).toEqual({
    detail: "Table",
    id: "table:t1",
    kind: "resource",
    label: "Customer renewals",
    target: { kind: "table", id: "t1" },
  })
})

test("the catalog recognizes every name offered, and any resource token", () => {
  const catalog = createMentionCatalog(sources)

  expect(catalog.resource).toBe(true)
  expect(catalog.integration).toEqual([
    { id: "slack", tokens: ["slack"] },
    { id: "googleCalendar", tokens: ["google calendar", "googlecalendar"] },
  ])
  expect(catalog.skill?.map((entry) => entry.id)).toEqual([
    "triage",
    "release-notes",
  ])
  expect(catalog.tool?.map((entry) => entry.id)).toEqual([
    "search_files",
    "conversations_add_message",
  ])
})
