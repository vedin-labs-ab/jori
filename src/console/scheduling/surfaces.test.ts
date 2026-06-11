import { describe, expect, test } from "vitest"
import {
  findScheduleSurfaceMentions,
  normalizeScheduleSurfaceMentions,
  syncScheduleSurfaces,
} from "./surfaces"

describe("schedule integration markers", () => {
  test("recognizes case-insensitive aliases in mention markers", () => {
    expect(
      findScheduleSurfaceMentions(
        "Review @github, write a doc in @google drive, then email via @outlook."
      )
    ).toEqual(["github", "googleDrive", "microsoftEmail"])
  })

  test("normalizes recognized markers to canonical labels", () => {
    expect(
      normalizeScheduleSurfaceMentions("Post to @slack and create @notion page")
    ).toBe("Post to @Slack and create @Notion page")
  })

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
    expect(syncScheduleSurfaces("@GitHub", [], "selected")).toEqual([
      { provider: "github", access: "" },
    ])
  })
})
