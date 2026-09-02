import { toolSurfaces } from "@contracts/integrations"
import { describe, expect, test } from "vitest"
import { type ToolPermission } from "@/shared/console/tools/model"
import {
  createJobMentionCatalog,
  findActiveJobMention,
  findCompletedJobMention,
  getJobMentionSuggestions,
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
  { access: { kind: "builtIn" }, id: "save_file", surface: "jori" },
  { access: { kind: "builtIn" }, id: "start_agent", surface: "jori" },
  { access: { kind: "web" }, id: "web_search", surface: "jori" },
]

describe("explicit mention scanning", () => {
  test("recognizes sigil tokens for all three kinds", () => {
    expect(
      readJobMentions(
        "Review @github, run /meeting-prep, then #save_file.",
        catalog
      )
    ).toEqual([
      { end: 14, id: "github", kind: "integration", start: 7 },
      { end: 33, id: "meeting-prep", kind: "skill", start: 20 },
      { end: 50, id: "save_file", kind: "tool", start: 40 },
    ])
  })

  test("never scans bare prose", () => {
    expect(
      readJobMentions("Review github and email via outlook.", catalog)
    ).toEqual([])
  })

  test("emails, URLs, paths, and headings stay inert", () => {
    const text = [
      "Mail person@gmail.com about https://acme.com/meeting-prep.",
      "# release-notes",
      "See docs/meeting-prep and read/write flows.",
    ].join("\n")

    expect(readJobMentions(text, catalog)).toEqual([])
  })

  test("sigils fire only at whitespace boundaries", () => {
    expect(
      readJobMentions("Run /meeting-prep and #save_file", catalog)
    ).toHaveLength(2)
    expect(
      readJobMentions('Run x/meeting-prep, x#save_file, and "@GitHub"', catalog)
    ).toEqual([])
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

describe("active mention autocomplete", () => {
  test("finds the sigil-started query under the cursor per kind", () => {
    expect(findActiveJobMention("Send to @li", 11)).toEqual({
      end: 11,
      kind: "integration",
      query: "li",
      start: 8,
    })
    expect(findActiveJobMention("Run /mee", 8)).toEqual({
      end: 8,
      kind: "skill",
      query: "mee",
      start: 4,
    })
    expect(findActiveJobMention("Use #sha", 8)).toEqual({
      end: 8,
      kind: "tool",
      query: "sha",
      start: 4,
    })
  })

  test("never activates inside emails, URLs, or bare words", () => {
    expect(findActiveJobMention("person@gm", 9)).toBeNull()
    expect(findActiveJobMention("https://ac", 10)).toBeNull()
    expect(findActiveJobMention("and/or", 6)).toBeNull()
    expect(findActiveJobMention("Send git", 8)).toBeNull()
  })

  test("finds a nearby mention without scanning the preceding paragraph", () => {
    const text = `${"Earlier context. ".repeat(100)}Use #sha`

    expect(findActiveJobMention(text, text.length)).toEqual({
      end: text.length,
      kind: "tool",
      query: "sha",
      start: text.length - 4,
    })
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
      toolPermission("jori", "save_file", "write", "allowed"),
      {
        ...toolPermission("jori", "start_agent", "write", "required"),
        route: "agent" as const,
      },
    ]
    const suggestions = getJobMentionSuggestions(
      { kind: "tool", query: "" },
      { permissions, skills: [], surfaces: [], webSearch: false }
    )

    expect(
      suggestions.map(({ access, id, surface }) => ({ access, id, surface }))
    ).toEqual(expectedToolAccessSuggestions)
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
