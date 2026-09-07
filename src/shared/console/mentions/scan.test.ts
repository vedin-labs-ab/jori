import { describe, expect, test } from "vitest"
import { findActiveMention } from "./active"
import { mentionText } from "./node"
import {
  catalogKinds,
  findCompletedMention,
  type MentionCatalog,
  mentionKinds,
  parseResourceMention,
  readMentions,
  resourceMentionId,
} from "./scan"

const catalog: MentionCatalog = {
  integration: [{ id: "slack", tokens: ["slack"] }],
  resource: true,
  skill: [{ id: "triage", tokens: ["triage"] }],
  tool: [{ id: "search_files", tokens: ["search_files"] }],
}

describe("mention scan", () => {
  test("reads each sigil's token by name, and a resource by its bracketed kind and id", () => {
    expect(
      readMentions(
        "Use /triage on +[table:k17abc] with #search_files via @Slack.",
        catalog
      )
    ).toEqual([
      { end: 11, id: "triage", kind: "skill", start: 4 },
      { end: 30, id: "table:k17abc", kind: "resource", start: 15 },
      { end: 49, id: "search_files", kind: "tool", start: 36 },
      { end: 60, id: "slack", kind: "integration", start: 54 },
    ])
  })

  test("never reads prose: sums, emails, numbers, tags, unknown kinds, and bare names stay text", () => {
    for (const text of [
      "a+b",
      "person@slack.com",
      "issue #1 and #hashtag",
      "and/or triage",
      "+[video:abc] +[table:] +[table:with space] +table:abc",
      "see+[table:abc]",
      "x@slack",
    ]) {
      expect(readMentions(text, catalog)).toEqual([])
    }
  })

  test("a catalog decides which sigils are live", () => {
    expect(catalogKinds(catalog)).toEqual([...mentionKinds])
    expect(catalogKinds({ skill: [] })).toEqual(["skill"])
    expect(
      readMentions("+[table:abc] /triage", { skill: catalog.skill })
    ).toEqual([{ end: 20, id: "triage", kind: "skill", start: 13 }])
  })

  test("a resource token carries its target both ways", () => {
    const target = { kind: "table", id: "k17abc" } as const

    expect(resourceMentionId(target)).toBe("table:k17abc")
    expect(parseResourceMention("table:k17abc")).toEqual(target)
    expect(parseResourceMention("video:k17abc")).toBeNull()
    expect(parseResourceMention(7)).toBeNull()
    expect(mentionText("resource", "table:k17abc")).toBe("+[table:k17abc]")
    expect(mentionText("integration", "googleCalendar")).toBe(
      "@Google Calendar"
    )
    expect(mentionText("skill", "triage")).toBe("/triage")
    expect(mentionText("tool", "search_files")).toBe("#search_files")
  })

  test("a finished token at the end of the text completes", () => {
    expect(findCompletedMention("Run /triage", catalog)).toMatchObject({
      id: "triage",
      kind: "skill",
    })
    expect(findCompletedMention("Run /triage now", catalog)).toBeNull()
    expect(findCompletedMention("Run /tri", catalog)).toBeNull()
  })
})

describe("active mention", () => {
  test("finds the sigil and query the cursor is in, for the kinds an editor takes", () => {
    expect(findActiveMention("Look at +ren", 12, mentionKinds)).toEqual({
      end: 12,
      kind: "resource",
      query: "ren",
      start: 8,
    })
    expect(findActiveMention("Look at /tr", 11, mentionKinds)).toMatchObject({
      kind: "skill",
      query: "tr",
    })
    expect(findActiveMention("Look at #", 9, mentionKinds)).toMatchObject({
      kind: "tool",
      query: "",
    })
    expect(findActiveMention("Look at @sl", 11, mentionKinds)).toMatchObject({
      kind: "integration",
      query: "sl",
    })
  })

  test("stays quiet after a sum, inside an email, past a space, and for a sigil the editor lacks", () => {
    expect(findActiveMention("a+b", 3, mentionKinds)).toBeNull()
    expect(findActiveMention("person@gmail", 12, mentionKinds)).toBeNull()
    expect(findActiveMention("+ren later", 10, mentionKinds)).toBeNull()
    expect(
      findActiveMention("Look at +ren", 12, ["integration", "skill", "tool"])
    ).toBeNull()
  })
})
