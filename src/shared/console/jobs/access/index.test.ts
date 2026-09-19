import { toolSurfaces } from "@contracts/integrations"
import { toolPermissions } from "@contracts/permissions"
import { describe, expect, test } from "vitest"
import { type ToolPermission } from "@/shared/console/tools/model"
import {
  createJobMentionCatalog,
  findCompletedJobMention,
  getDefaultJobSurfaceTools,
  getJobMentionSuggestions,
  getJobSurfacePermissions,
  readJobMentions,
} from "."

const catalog = createJobMentionCatalog({
  skills: ["meeting-prep", "release-notes"],
  tools: ["save_file", "github_get_issue"],
})
const expectedToolAccessSuggestions = [
  {
    access: { integration: "github", kind: "integration" },
    id: "github_get_issue",
    surface: "github",
  },
  { access: { kind: "core" }, id: "load_skill", surface: "jori" },
  { access: { kind: "ready" }, id: "save_file", surface: "jori" },
  {
    access: { integration: "jori", kind: "integration" },
    id: "start_agent",
    surface: "jori",
  },
  {
    access: { integration: "jori", kind: "integration" },
    id: "web_search",
    surface: "jori",
  },
]
const catalogPermissions: ToolPermission[] = toolPermissions.map(
  (permission) => ({
    ...permission,
    mode: permission.defaultMode,
    overrideMode: null,
  })
)

describe("explicit mention scanning", () => {
  test("recognizes sigil tokens for all three kinds", () => {
    expect(
      readJobMentions(
        "Review @github, run /meeting-prep, then #save_file. +[table:abc]",
        catalog
      )
    ).toEqual([
      { end: 14, id: "github", kind: "integration", start: 7 },
      { end: 33, id: "meeting-prep", kind: "skill", start: 20 },
      { end: 50, id: "save_file", kind: "tool", start: 40 },
    ])
  })
})

describe("completed mention detection", () => {
  test("finds a finished explicit token at the end of the text", () => {
    expect(findCompletedJobMention("Post to @github", catalog)).toEqual({
      end: 15,
      id: "github",
      kind: "integration",
      start: 8,
    })
    expect(findCompletedJobMention("Run /meeting-prep", catalog)).toEqual({
      end: 17,
      id: "meeting-prep",
      kind: "skill",
      start: 4,
    })
  })

  test("accepts fuzzy spellings for integrations only", () => {
    expect(findCompletedJobMention("Open @githb", catalog)).toEqual({
      end: 11,
      id: "github",
      kind: "integration",
      start: 5,
    })
    expect(findCompletedJobMention("Open github", catalog)).toBeNull()
    expect(findCompletedJobMention("Run /meeting-prp", catalog)).toBeNull()
  })
})

describe("mention suggestions", () => {
  const sources = {
    permissions: [
      toolPermission("github", "github_get_issue", "read", "allowed"),
      toolPermission("github", "github_delete_issue", "write", "blocked"),
    ],
    skills: ["meeting-prep", "release-notes"],
  }

  test("ranks integrations by prefix and alias", () => {
    const items = getJobMentionSuggestions(
      { kind: "integration", query: "li" },
      sources
    )

    expect(items.map((item) => item.id)).toEqual(["linear"])
  })

  test("ranks skills by name and lists all on empty query", () => {
    expect(
      getJobMentionSuggestions({ kind: "skill", query: "rel" }, sources).map(
        (item) => item.id
      )
    ).toEqual(["release-notes"])
    expect(
      getJobMentionSuggestions({ kind: "skill", query: "" }, sources)
    ).toHaveLength(2)
  })

  test("shows unavailable tools only while searching", () => {
    expect(
      getJobMentionSuggestions({ kind: "tool", query: "" }, sources).some(
        (item) => item.id === "github_delete_issue"
      )
    ).toBe(false)

    expect(
      getJobMentionSuggestions({ kind: "tool", query: "github" }, sources).map(
        (item) => ({ disabled: item.disabled, id: item.id })
      )
    ).toEqual([
      { disabled: false, id: "github_get_issue" },
      { disabled: true, id: "github_delete_issue" },
    ])
  })

  test("classifies the access a tool selection will add", () => {
    const permissions = [
      toolPermission("github", "github_get_issue", "read", "allowed"),
      toolPermission("jori", "web_search", "read", "allowed"),
      toolPermission("jori", "load_skill", "read", "required"),
      toolPermission("jori", "save_file", "write", "allowed"),
      {
        ...toolPermission("jori", "start_agent", "write", "required"),
        route: "agent" as const,
      },
    ]
    const suggestions = getJobMentionSuggestions(
      { kind: "tool", query: "" },
      {
        permissions,
        skills: [],
        surfaces: [{ integration: "jori", tools: ["save_file"] }],
      }
    )

    expect(
      suggestions.map(({ access, id, surface }) => ({ access, id, surface }))
    ).toEqual(expectedToolAccessSuggestions)
  })
})

describe("surface grants", () => {
  test("naming Jori grants reads of the organization's own materials only", () => {
    const tools = getDefaultJobSurfaceTools("jori", catalogPermissions)

    expect(tools).toContain("read_table")
    expect(tools).not.toContain("insert_table_row")
    expect(tools).not.toContain("web_search")
    expect(tools).not.toContain("bash")
  })

  test("never offers a core tool as a grant", () => {
    const tools = getJobSurfacePermissions("jori", catalogPermissions).map(
      (permission) => permission.tool
    )

    expect(tools).toContain("read_table")
    expect(tools).not.toContain("load_skill")
  })
})

test.each(toolSurfaces)("preserves the %s tool provider", (surface) => {
  const suggestion = getJobMentionSuggestions(
    { kind: "tool", query: "" },
    {
      permissions: [
        toolPermission(surface, `${surface}_tool`, "read", "allowed"),
      ],
      skills: [],
    }
  )[0]

  expect(suggestion?.surface).toBe(surface)
})

function toolPermission(
  surface: ToolPermission["surface"],
  tool: string,
  access: ToolPermission["access"],
  mode: ToolPermission["mode"]
): ToolPermission {
  return {
    access,
    description: tool,
    label: tool,
    mode,
    overrideMode: null,
    route: "broker",
    surface,
    tool,
  }
}
