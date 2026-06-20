import { describe, expect, test } from "vitest"
import { createIntegrationActor, getActorDisplayName } from "./actor"

describe("actors", () => {
  test("displays integration actor names before provider identifiers", () => {
    const actor = createIntegrationActor({
      externalId: "U123",
      email: "ada@example.com",
      name: "Ada Lovelace",
    })

    expect(getActorDisplayName(actor)).toBe("Ada Lovelace")
  })

  test("falls back to integration actor email before raw identifier", () => {
    const actor = createIntegrationActor({
      externalId: "U123",
      email: "ada@example.com",
    })

    expect(getActorDisplayName(actor)).toBe("ada@example.com")
  })

  test("falls back to the provider actor id", () => {
    const actor = createIntegrationActor({
      externalId: "U123",
    })

    expect(getActorDisplayName(actor)).toBe("U123")
  })
})
