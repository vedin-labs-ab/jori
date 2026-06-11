import { describe, expect, test } from "vitest"
import {
  findActiveScheduleSurfaceMention,
  findScheduleSurfaceMentions,
  getScheduleSurfaceMentionParts,
  getScheduleSurfaceSuggestions,
  normalizeCompletedScheduleSurfaceMentions,
  normalizeScheduleSurfaceMentions,
  replaceScheduleSurfaceMention,
  syncScheduleSurfaces,
} from "./surfaces"

describe("schedule integration marker parsing", () => {
  test("recognizes case-insensitive aliases in mention markers", () => {
    expect(
      findScheduleSurfaceMentions(
        "Review @github, write a doc in @google drive, then email via @outlook."
      )
    ).toEqual(["github", "googleDrive", "microsoftEmail"])
  })

  test("recognizes bare provider names as markers", () => {
    expect(
      findScheduleSurfaceMentions(
        "Review github, write a doc in google drive, then email via outlook."
      )
    ).toEqual(["github", "googleDrive", "microsoftEmail"])
  })

  test("normalizes recognized markers to canonical labels", () => {
    expect(
      normalizeScheduleSurfaceMentions("Post to @slack and create @notion page")
    ).toBe("Post to @Slack and create @Notion page")
  })

  test("normalizes bare markers to canonical labels", () => {
    expect(
      normalizeScheduleSurfaceMentions("Post to slack and create notion page")
    ).toBe("Post to @Slack and create @Notion page")
  })

  test("normalizes completed markers as soon as the user types a boundary", () => {
    expect(
      normalizeCompletedScheduleSurfaceMentions("Post to @github, then stop")
    ).toBe("Post to @GitHub, then stop")

    expect(
      normalizeCompletedScheduleSurfaceMentions("Post to github, then stop")
    ).toBe("Post to @GitHub, then stop")
  })

  test("keeps active marker text untouched until a boundary is typed", () => {
    expect(normalizeCompletedScheduleSurfaceMentions("Post to @github")).toBe(
      "Post to @github"
    )
    expect(normalizeCompletedScheduleSurfaceMentions("Post to github")).toBe(
      "Post to github"
    )
  })

  test("normalizes close marker typos only when the match is clear", () => {
    expect(normalizeCompletedScheduleSurfaceMentions("Open @githb ")).toBe(
      "Open @GitHub "
    )
    expect(normalizeCompletedScheduleSurfaceMentions("Use @go ")).toBe(
      "Use @go "
    )
    expect(normalizeCompletedScheduleSurfaceMentions("Open githb ")).toBe(
      "Open @GitHub "
    )
    expect(normalizeCompletedScheduleSurfaceMentions("Use git ")).toBe(
      "Use git "
    )
  })
})

describe("schedule integration marker autocomplete", () => {
  test("finds active marker queries for autocomplete", () => {
    expect(findActiveScheduleSurfaceMention("Send to @li", 11)).toEqual({
      end: 11,
      kind: "explicit",
      query: "li",
      start: 8,
    })
    expect(findActiveScheduleSurfaceMention("Send to @li now", 15)).toBeNull()
  })

  test("starts bare autocomplete after three characters", () => {
    expect(findActiveScheduleSurfaceMention("Send gi", 7)).toBeNull()
    expect(findActiveScheduleSurfaceMention("Send git", 8)).toEqual({
      end: 8,
      kind: "bare",
      query: "git",
      start: 5,
    })
  })

  test("suggests providers from prefixes and aliases", () => {
    expect(
      getScheduleSurfaceSuggestions("li").map((item) => item.provider)
    ).toEqual(["linear"])

    expect(
      getScheduleSurfaceSuggestions("go").map((item) => item.provider)
    ).toEqual(
      expect.arrayContaining(["gmail", "googleCalendar", "googleDrive"])
    )
  })

  test("replaces the active marker with a canonical mention", () => {
    expect(
      replaceScheduleSurfaceMention(
        "Send to @li",
        { end: 11, kind: "explicit", query: "li", start: 8 },
        "linear"
      )
    ).toEqual({
      cursor: 16,
      text: "Send to @Linear ",
    })

    expect(
      replaceScheduleSurfaceMention(
        "Send git",
        { end: 8, kind: "bare", query: "git", start: 5 },
        "github"
      )
    ).toEqual({
      cursor: 13,
      text: "Send @GitHub ",
    })
  })

  test("splits recognized markers for highlighted rendering", () => {
    expect(getScheduleSurfaceMentionParts("Use github and @Slack.")).toEqual([
      { text: "Use " },
      { provider: "github", text: "github" },
      { text: " and " },
      { provider: "slack", text: "@Slack" },
      { text: "." },
    ])
  })
})

describe("schedule integration access sync", () => {
  test("keeps existing access and defaults new all-read markers to read", () => {
    expect(
      syncScheduleSurfaces(
        "@GitHub to @Slack",
        [{ provider: "slack", access: "write" }],
        "allConnected"
      )
    ).toEqual([
      { provider: "github", access: "read" },
      { provider: "slack", access: "write" },
    ])
  })

  test("leaves new selected-read markers unclassified", () => {
    expect(syncScheduleSurfaces("GitHub", [], "selected")).toEqual([
      { provider: "github", access: "" },
    ])
  })
})
