import { describe, expect, test } from "vitest"
import { jobInstructionMarkerErrors } from "@/shared/console/jobs/editor/errors"
import { emptyJobForm } from "@/shared/console/jobs/types"
import { createJobArgs } from "./args"

describe("job payload", () => {
  test("requires every marker to have at least one selected tool", () => {
    expect(
      createJobArgs({
        ...emptyJobForm,
        name: "Weekly release summary",
        instructions: "Summarize GitHub.",
        surfaces: [{ integration: "github", tools: [] }],
      })
    ).toEqual({
      error: "Choose at least one tool for each mentioned integration.",
    })
  })

  test("requires at least one write tool, an integration's or Jori's", () => {
    expect(
      createJobArgs(
        {
          ...emptyJobForm,
          name: "Weekly release summary",
          instructions: "Summarize GitHub.",
          surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
        },
        { permissions: jobPermissions() }
      )
    ).toEqual({
      error: "Give at least one mentioned integration a write tool.",
    })
    expect(
      createJobArgs(
        {
          ...emptyJobForm,
          name: "Log the weekly total",
          instructions: "Ask @Jori to add a row.",
          surfaces: [{ integration: "jori", tools: ["insert_table_row"] }],
        },
        { permissions: jobPermissions() }
      )
    ).toHaveProperty("args")
  })

  test("rejects personal integrations for organization jobs", () => {
    expect(
      createJobArgs({
        ...emptyJobForm,
        name: "Shared inbox digest",
        instructions: "Summarize @Gmail.",
        visibility: { mode: "organization" },
        scope: "organization",
        surfaces: [{ integration: "gmail", tools: ["gmail_search"] }],
      })
    ).toEqual({
      error:
        "Organization jobs can't use personal access. Remove the highlighted items or switch to Personal.",
    })
  })
})

test("creates job args with access and source bindings", () => {
  expect(
    createJobArgs(
      {
        ...emptyJobForm,
        name: "Weekly release summary",
        instructions: "Summarize @GitHub with @Jori and post to @Slack.",
        surfaces: [
          { integration: "github", tools: ["github_get_issue"] },
          { integration: "jori", tools: ["read_table", "web_search"] },
          { integration: "slack", tools: ["conversations_add_message"] },
        ],
      },
      { permissions: jobPermissions() }
    )
  ).toEqual({
    args: {
      name: "Weekly release summary",
      instructions: "Summarize @GitHub with @Jori and post to @Slack.",
      visibility: { mode: "private" },
      access: {
        integrations: [
          { integration: "github", tools: ["github_get_issue"] },
          { integration: "slack", tools: ["conversations_add_message"] },
        ],
        jori: ["read_table", "web_search"],
      },
      type: "cron",
      trigger: { expression: "0 9 * * *", timezone: "UTC" },
    },
  })
})

test("a chosen folder rides along in create args only when set", () => {
  const values: Parameters<typeof createJobArgs>[0] = {
    ...emptyJobForm,
    name: "Weekly release summary",
    instructions: "Summarize @GitHub.",
    surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
  }

  expect(createJobArgs(values)).toMatchObject({
    args: expect.not.objectContaining({ folderId: expect.anything() }),
  })
  expect(createJobArgs({ ...values, folderId: "finance" })).toMatchObject({
    args: { folderId: "finance" },
  })
})

test("rejects job access blocked by tool permissions", () => {
  expect(
    createJobArgs(
      {
        ...emptyJobForm,
        name: "Weekly release summary",
        instructions: "Summarize GitHub and post to Slack.",
        surfaces: [
          { integration: "github", tools: ["github_get_issue"] },
          { integration: "slack", tools: ["conversations_add_message"] },
        ],
      },
      {
        permissions: [
          toolPermission({
            access: "read",
            mode: "prompted",
            surface: "github",
            tool: "github_get_issue",
          }),
          toolPermission({
            access: "write",
            mode: "allowed",
            surface: "slack",
            tool: "conversations_add_message",
          }),
        ],
      }
    )
  ).toEqual({
    error: jobInstructionMarkerErrors.unavailableAccess,
  })
})

test("rejects a tool reference without its integration access", () => {
  expect(
    createJobArgs(
      {
        ...emptyJobForm,
        name: "Weekly release summary",
        instructions:
          "Read @GitHub and use #github_add_issue_comment for the result.",
        surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
      },
      { permissions: jobPermissions() }
    )
  ).toEqual({
    error: "Give @GitHub access to use #github_add_issue_comment.",
  })
})

test("rejects a Jori tool reference without the Jori grant", () => {
  expect(
    createJobArgs(
      {
        ...emptyJobForm,
        name: "Weekly release summary",
        instructions: "Post with @Slack after #web_search.",
        surfaces: [
          {
            integration: "slack",
            tools: ["conversations_add_message"],
          },
        ],
      },
      { permissions: jobPermissions() }
    )
  ).toEqual({ error: "Give @Jori access to use #web_search." })
})

test("ignores illustrative tool names in programming fences", () => {
  const result = createJobArgs(
    {
      ...emptyJobForm,
      name: "Weekly release summary",
      instructions: [
        "Post with @Slack.",
        "",
        "```json",
        '{"tool":"#github_get_issue"}',
        "```",
      ].join("\n"),
      surfaces: [
        {
          integration: "slack",
          tools: ["conversations_add_message"],
        },
      ],
    },
    { permissions: jobPermissions() }
  )

  expect(result).toHaveProperty("args")
})

function jobPermissions() {
  return [
    toolPermission({
      access: "read",
      surface: "github",
      tool: "github_get_issue",
    }),
    toolPermission({
      access: "write",
      surface: "github",
      tool: "github_add_issue_comment",
    }),
    toolPermission({
      access: "write",
      surface: "slack",
      tool: "conversations_add_message",
    }),
    toolPermission({ access: "read", surface: "jori", tool: "read_table" }),
    toolPermission({ access: "read", surface: "jori", tool: "web_search" }),
    toolPermission({
      access: "write",
      surface: "jori",
      tool: "insert_table_row",
    }),
  ]
}

function toolPermission(
  overrides: Partial<{
    access: "read" | "write"
    mode: "required" | "allowed" | "prompted" | "blocked"
    surface: "github" | "jori" | "slack"
    tool: string
  }>
) {
  return {
    access: overrides.access ?? "read",
    description: "Tool",
    label: "Tool",
    mode: overrides.mode ?? "allowed",
    overrideMode: null,
    route: "broker" as const,
    surface: overrides.surface ?? "github",
    tool: overrides.tool ?? "github_get_issue",
  }
}
