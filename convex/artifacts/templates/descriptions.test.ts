import { describe, expect, test } from "vitest"
import { playbookTemplates } from "./_generated/templates"

// Contract state entries speak to two audiences, mirroring the tool rows:
// `description` is what the console shows people, `usage` is the working
// guidance rendered into the agent's run context. These tests keep the
// audiences from bleeding into each other as templates evolve.

const mechanicsVocabulary = [
  "entityKey",
  "contentHash",
  "schemaVersion",
  "expectedVersion",
  "revision",
  "dispatch",
  "patch",
  "claim",
  "keyed",
]

const entries = Object.entries(playbookTemplates).flatMap(([key, template]) =>
  template.contract.state.map((entry) => ({ template: key, ...entry }))
)

describe("template contract descriptions", () => {
  test("every state entry carries both audience descriptions", () => {
    for (const entry of entries) {
      expect(entry.description, `${entry.template}/${entry.name}`).toBeTruthy()
      expect(entry.usage, `${entry.template}/${entry.name}`).toBeTruthy()
    }
  })

  test("user descriptions carry no state mechanics vocabulary", () => {
    for (const entry of entries) {
      for (const token of mechanicsVocabulary) {
        expect(
          entry.description?.toLowerCase().includes(token.toLowerCase()),
          `${entry.template}/${entry.name} description mentions "${token}" — that guidance belongs in usage`
        ).toBe(false)
      }
    }
  })
})
