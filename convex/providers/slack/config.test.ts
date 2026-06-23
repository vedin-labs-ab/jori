import { describe, expect, test } from "vitest"
import {
  slackBotScopes,
  slackInstallUserScopes,
  slackUserScopes,
} from "./config"

describe("Slack OAuth scopes", () => {
  test("requests bot scopes needed for message event delivery", () => {
    expect(slackBotScopes).toEqual(
      expect.arrayContaining([
        "app_mentions:read",
        "channels:history",
        "groups:history",
        "im:history",
        "mpim:history",
      ])
    )
  })

  test("keeps install user scopes as readable Slack user scopes plus email", () => {
    expect(slackInstallUserScopes).toEqual([
      ...slackUserScopes,
      "users:read.email",
    ])
  })
})
