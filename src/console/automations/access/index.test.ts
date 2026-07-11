import { describe, expect, test } from "vitest"
import { type ToolPermission } from "../../permissions/types"
import {
  createAutomationMentionCatalog,
  findActiveAutomationMention,
  findAutomationSurfaceMentions,
  findCompletedAutomationMention,
  getAutomationMentionSuggestions,
  readAutomationMentions,
  sigilizeAutomationMentions,
  syncAutomationSurfaces,
} from "."

const catalog = createAutomationMentionCatalog({
  skills: ["meeting-prep", "release-notes"],
  tools: ["share_artifact", "github_get_issue"],
})

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

  test("matches multi-word aliases case-insensitively", () => {
    expect(
      findAutomationSurfaceMentions(
        "Book time in @google calendar, then email via @Outlook.",
        catalog
      )
    ).toEqual(["googleCalendar", "microsoftEmail"])
  })

  test("never scans bare prose", () => {
    expect(
      findAutomationSurfaceMentions(
        "Review github and email via outlook.",
        catalog
      )
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

  test("skill and tool sigils fire only after whitespace", () => {
    expect(
      readAutomationMentions("Run /meeting-prep and #share_artifact", catalog)
    ).toHaveLength(2)
    expect(
      readAutomationMentions("Run x/meeting-prep and x#share_artifact", catalog)
    ).toEqual([])
  })
})

describe("legacy text sigilization", () => {
  test("rewrites exact bare names and fuzzy @-typos to sigil tokens", () => {
    expect(
      sigilizeAutomationMentions("Post to slack and create a notion page")
    ).toBe("Post to @Slack and create a @Notion page")
    expect(sigilizeAutomationMentions("Open @githb now")).toBe(
      "Open @GitHub now"
    )
  })

  test("leaves sigil tokens, near-misses, and prose untouched", () => {
    expect(sigilizeAutomationMentions("Post to @Slack, then stop")).toBe(
      "Post to @Slack, then stop"
    )
    expect(sigilizeAutomationMentions("Mail person@gmail.com about it")).toBe(
      "Mail person@gmail.com about it"
    )
    expect(sigilizeAutomationMentions("Use the linear-time flow")).toBe(
      "Use the linear-time flow"
    )
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

  test("offers only selectable tools", () => {
    expect(
      getAutomationMentionSuggestions(
        { kind: "tool", query: "github" },
        sources
      ).map((item) => item.id)
    ).toEqual(["github_get_issue"])
  })
})

describe("automation integration tool sync", () => {
  test("preserves selected tools for existing markers", () => {
    expect(
      syncAutomationSurfaces("@GitHub to @Slack", [
        { integration: "slack", tools: ["conversations_add_message"] },
      ])
    ).toEqual([
      { integration: "github", tools: [] },
      { integration: "slack", tools: ["conversations_add_message"] },
    ])
  })

  test("adds new markers with selectable tools", () => {
    const permissions = [
      toolPermission("github", "github_get_issue", "read", "allowed"),
      toolPermission("github", "github_add_issue_comment", "write", "required"),
      toolPermission("github", "github_close_issue", "write", "prompted"),
    ] satisfies ToolPermission[]

    expect(syncAutomationSurfaces("@GitHub", [], permissions)).toEqual([
      {
        integration: "github",
        tools: ["github_get_issue", "github_add_issue_comment"],
      },
    ])
  })

  test("ignores bare names while permissions load", () => {
    expect(syncAutomationSurfaces("GitHub", [])).toEqual([])
    expect(syncAutomationSurfaces("@GitHub", [])).toEqual([
      { integration: "github", tools: [] },
    ])
  })
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
