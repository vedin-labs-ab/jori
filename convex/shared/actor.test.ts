import { describe, expect, test } from "vitest"
import { createIntegrationActor, getActorDisplayName } from "./actor"

describe("actors", () => {
  test("displays integration actor names before provider identifiers", () => {
    const actor = createIntegrationActor({
      integration: "slack",
      externalId: "U123",
      email: "ada@example.com",
      name: "Ada Lovelace",
    })

    expect(getActorDisplayName(actor)).toBe("Ada Lovelace")
  })

  test("falls back to integration actor email before raw identifier", () => {
    const actor = createIntegrationActor({
      integration: "slack",
      externalId: "U123",
      email: "ada@example.com",
    })

    expect(getActorDisplayName(actor)).toBe("ada@example.com")
  })

  test("keeps Slack mention fallback when no profile is available", () => {
    const actor = createIntegrationActor({
      integration: "slack",
      externalId: "U123",
    })

    expect(getActorDisplayName(actor)).toBe("<@U123>")
  })
})
