import { toolSurfaces } from "@contracts/integrations"
import { describe, expect, test } from "vitest"
import { type ToolPermission } from "../../permissions/types"
import {
  createAutomationMentionCatalog,
  findActiveAutomationMention,
  findCompletedAutomationMention,
  getAutomationMentionSuggestions,
  readAutomationMentions,
} from "."

const catalog = createAutomationMentionCatalog({
  skills: ["meeting-prep", "release-notes"],
  tools: ["share_artifact", "github_get_issue"],
})
const expectedToolAccessSuggestions = [
  {
    access: { integration: "github", kind: "integration" },
    id: "github_get_issue",
    surface: "github",
  },
  { access: { kind: "builtIn" }, id: "share_artifact", surface: "milo" },
  { access: { kind: "builtIn" }, id: "start_agent", surface: "milo" },
  { access: { kind: "web" }, id: "web_search", surface: "milo" },
]

describe("explicit mention scanning", () => {
  test("recognizes sigil tokens for all three kinds", () => {
    expect(
      readAutomationMentions(
        "Review @github, run /meeting-prep, then #share_artifact.",
        catalog
      )
    ).toEqual([
      { end: 14, id: "github", kind: "integration", start: 7 },
      { end: 33, id: "meeting-prep", kind: "skill", start: 20 },
      { end: 55, id: "share_artifact", kind: "tool", start: 40 },
    ])
  })

  test("never scans bare prose", () => {
    expect(
      readAutomationMentions("Review github and email via outlook.", catalog)
    ).toEqual([])
  })

  test("emails, URLs, paths, and headings stay inert", () => {
    const text = [
      "Mail person@gmail.com about https://acme.com/meeting-prep.",
      "# release-notes",
      "See docs/meeting-prep and read/write flows.",
    ].join("\n")

    expect(readAutomationMentions(text, catalog)).toEqual([])
  })

  test("sigils fire only at whitespace boundaries", () => {
    expect(
      readAutomationMentions("Run /meeting-prep and #share_artifact", catalog)
    ).toHaveLength(2)
    expect(
      readAutomationMentions(
        'Run x/meeting-prep, x#share_artifact, and "@GitHub"',
        catalog
      )
    ).toEqual([])
  })
})

describe("completed mention detection", () => {
  test("finds a finished explicit token at the end of the text", () => {
    expect(findCompletedAutomationMention("Post to @github", catalog)).toEqual({
      end: 15,
      id: "github",
      kind: "integration",
      start: 8,
    })
    expect(
      findCompletedAutomationMention("Run /meeting-prep", catalog)
    ).toEqual({ end: 17, id: "meeting-prep", kind: "skill", start: 4 })
  })

  test("accepts fuzzy spellings for integrations only", () => {
    expect(findCompletedAutomationMention("Open @githb", catalog)).toEqual({
      end: 11,
      id: "github",
      kind: "integration",
      start: 5,
    })
    expect(findCompletedAutomationMention("Open github", catalog)).toBeNull()
    expect(
      findCompletedAutomationMention("Run /meeting-prp", catalog)
    ).toBeNull()
  })
})

describe("active mention autocomplete", () => {
  test("finds the sigil-started query under the cursor per kind", () => {
    expect(findActiveAutomationMention("Send to @li", 11)).toEqual({
      end: 11,
      kind: "integration",
      query: "li",
      start: 8,
    })
    expect(findActiveAutomationMention("Run /mee", 8)).toEqual({
      end: 8,
      kind: "skill",
      query: "mee",
      start: 4,
    })
    expect(findActiveAutomationMention("Use #sha", 8)).toEqual({
      end: 8,
      kind: "tool",
      query: "sha",
      start: 4,
    })
  })

  test("never activates inside emails, URLs, or bare words", () => {
    expect(findActiveAutomationMention("person@gm", 9)).toBeNull()
    expect(findActiveAutomationMention("https://ac", 10)).toBeNull()
    expect(findActiveAutomationMention("and/or", 6)).toBeNull()
    expect(findActiveAutomationMention("Send git", 8)).toBeNull()
  })

  test("finds a nearby mention without scanning the preceding paragraph", () => {
    const text = `${"Earlier context. ".repeat(100)}Use #sha`

    expect(findActiveAutomationMention(text, text.length)).toEqual({
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
    const items = getAutomationMentionSuggestions(
      { kind: "integration", query: "li" },
      sources
    )

    expect(items.map((item) => item.id)).toEqual(["linear"])
  })

  test("ranks skills by name and lists all on empty query", () => {
    expect(
      getAutomationMentionSuggestions(
        { kind: "skill", query: "rel" },
        sources
      ).map((item) => item.id)
    ).toEqual(["release-notes"])
    expect(
      getAutomationMentionSuggestions({ kind: "skill", query: "" }, sources)
    ).toHaveLength(2)
  })

  test("shows unavailable tools only while searching", () => {
    expect(
      getAutomationMentionSuggestions(
        { kind: "tool", query: "" },
        sources
      ).some((item) => item.id === "github_delete_issue")
    ).toBe(false)

    expect(
      getAutomationMentionSuggestions(
        { kind: "tool", query: "github" },
        sources
      ).map((item) => ({ disabled: item.disabled, id: item.id }))
    ).toEqual([
      { disabled: false, id: "github_get_issue" },
      { disabled: true, id: "github_delete_issue" },
    ])
  })

  test("classifies the access a tool selection will add", () => {
    const permissions = [
      toolPermission("github", "github_get_issue", "read", "allowed"),
      toolPermission("milo", "web_search", "read", "allowed"),
      toolPermission("milo", "share_artifact", "write", "allowed"),
      {
        ...toolPermission("milo", "start_agent", "write", "required"),
        route: "agent" as const,
      },
    ]
    const suggestions = getAutomationMentionSuggestions(
      { kind: "tool", query: "" },
      { permissions, skills: [], surfaces: [], webSearch: false }
    )

    expect(
      suggestions.map(({ access, id, surface }) => ({ access, id, surface }))
    ).toEqual(expectedToolAccessSuggestions)
  })
})

test.each(toolSurfaces)("preserves the %s tool provider", (surface) => {
  const suggestion = getAutomationMentionSuggestions(
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
