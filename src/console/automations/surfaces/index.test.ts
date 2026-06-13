import { describe, expect, test } from "vitest"
import {
  findActiveAutomationSurfaceMention,
  findAutomationSurfaceMentions,
  getAutomationSurfaceMentionParts,
  getAutomationSurfaceSuggestions,
  normalizeAutomationSurfaceMentions,
  normalizeCompletedAutomationSurfaceMentions,
  replaceAutomationSurfaceMention,
  syncAutomationSurfaces,
} from "."

describe("automation integration marker parsing", () => {
  test("recognizes case-insensitive aliases in mention markers", () => {
    expect(
      findAutomationSurfaceMentions(
        "Review @github, write a doc in @google drive, then email via @outlook."
      )
    ).toEqual(["github", "googleDrive", "microsoftEmail"])
  })

  test("recognizes bare provider names as markers", () => {
    expect(
      findAutomationSurfaceMentions(
        "Review github, write a doc in google drive, then email via outlook."
      )
    ).toEqual(["github", "googleDrive", "microsoftEmail"])
  })

  test("normalizes recognized markers to canonical labels", () => {
    expect(
      normalizeAutomationSurfaceMentions(
        "Post to @slack and create @notion page"
      )
    ).toBe("Post to Slack and create Notion page")
  })

  test("normalizes bare markers to canonical labels", () => {
    expect(
      normalizeAutomationSurfaceMentions("Post to slack and create notion page")
    ).toBe("Post to Slack and create Notion page")
  })

  test("normalizes completed markers as soon as the user types a boundary", () => {
    expect(
      normalizeCompletedAutomationSurfaceMentions("Post to @github, then stop")
    ).toBe("Post to GitHub, then stop")

    expect(
      normalizeCompletedAutomationSurfaceMentions("Post to github, then stop")
    ).toBe("Post to GitHub, then stop")
  })

  test("keeps active marker text untouched until a boundary is typed", () => {
    expect(normalizeCompletedAutomationSurfaceMentions("Post to @github")).toBe(
      "Post to @github"
    )
    expect(normalizeCompletedAutomationSurfaceMentions("Post to github")).toBe(
      "Post to github"
    )
  })
})

describe("automation integration marker fuzzy normalization", () => {
  test("normalizes close marker typos only when the match is clear", () => {
    expect(normalizeCompletedAutomationSurfaceMentions("Open @githb ")).toBe(
      "Open GitHub "
    )
    expect(normalizeCompletedAutomationSurfaceMentions("Open @githbu ")).toBe(
      "Open GitHub "
    )
    expect(normalizeCompletedAutomationSurfaceMentions("Use @go ")).toBe(
      "Use @go "
    )
    expect(normalizeCompletedAutomationSurfaceMentions("Open githb ")).toBe(
      "Open GitHub "
    )
    expect(normalizeCompletedAutomationSurfaceMentions("Open githbu ")).toBe(
      "Open GitHub "
    )
    expect(normalizeCompletedAutomationSurfaceMentions("Use git ")).toBe(
      "Use git "
    )
    expect(normalizeCompletedAutomationSurfaceMentions("Open githxx ")).toBe(
      "Open githxx "
    )
  })
})

describe("automation integration marker autocomplete", () => {
  test("finds active marker queries for autocomplete", () => {
    expect(findActiveAutomationSurfaceMention("Send to @li", 11)).toEqual({
      end: 11,
      kind: "explicit",
      query: "li",
      start: 8,
    })
    expect(findActiveAutomationSurfaceMention("Send to @li now", 15)).toBeNull()
  })

  test("starts bare autocomplete after three characters", () => {
    expect(findActiveAutomationSurfaceMention("Send gi", 7)).toBeNull()
    expect(findActiveAutomationSurfaceMention("Send git", 8)).toEqual({
      end: 8,
      kind: "bare",
      query: "git",
      start: 5,
    })
  })

  test("suggests providers from prefixes and aliases", () => {
    expect(
      getAutomationSurfaceSuggestions("li").map((item) => item.provider)
    ).toEqual(["linear"])

    expect(
      getAutomationSurfaceSuggestions("go").map((item) => item.provider)
    ).toEqual(
      expect.arrayContaining(["gmail", "googleCalendar", "googleDrive"])
    )
  })

  test("replaces the active marker with a canonical mention", () => {
    expect(
      replaceAutomationSurfaceMention(
        "Send to @li",
        { end: 11, kind: "explicit", query: "li", start: 8 },
        "linear"
      )
    ).toEqual({
      cursor: 15,
      text: "Send to Linear ",
    })

    expect(
      replaceAutomationSurfaceMention(
        "Send git",
        { end: 8, kind: "bare", query: "git", start: 5 },
        "github"
      )
    ).toEqual({
      cursor: 12,
      text: "Send GitHub ",
    })
  })

  test("splits recognized markers for highlighted rendering", () => {
    expect(getAutomationSurfaceMentionParts("Use github and @Slack.")).toEqual([
      { text: "Use " },
      { provider: "github", text: "github" },
      { text: " and " },
      { provider: "slack", text: "@Slack" },
      { text: "." },
    ])
  })
})

describe("automation integration tool sync", () => {
  test("preserves selected tools for existing markers", () => {
    expect(
      syncAutomationSurfaces("@GitHub to @Slack", [
        { provider: "slack", tools: ["conversations_add_message"] },
      ])
    ).toEqual([
      { provider: "github", tools: [] },
      { provider: "slack", tools: ["conversations_add_message"] },
    ])
  })

  test("adds new markers without selected tools", () => {
    expect(syncAutomationSurfaces("GitHub", [])).toEqual([
      { provider: "github", tools: [] },
    ])
  })
})
