import { expect, test } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  automationKeyPartition,
  normalizeAutomationKey,
  sameAutomationDefinition,
} from "./keys"

test("normalizes keys and scopes their uniqueness", () => {
  const personId = "person" as Id<"persons">

  expect(normalizeAutomationKey("  meeting:event  ")).toBe("meeting:event")
  expect(automationKeyPartition({ kind: "person", personId })).toBe(
    "person:person"
  )
  expect(automationKeyPartition({ kind: "organization" })).toBe("organization")
})

test("idempotency compares semantic definitions", () => {
  const definition = automation()
  const reordered = {
    ...definition,
    access: {
      ...definition.access,
      integrations: definition.access.integrations.map((entry) => ({
        ...entry,
        tools: [...entry.tools].reverse(),
      })),
    },
    trigger: { ...definition.trigger, nextAt: 999 },
  } as Doc<"automations">

  expect(sameAutomationDefinition(definition, reordered)).toBe(true)
  expect(
    sameAutomationDefinition(definition, {
      ...definition,
      instructions: "Different work.",
    })
  ).toBe(false)
})

function automation() {
  return {
    access: {
      integrations: [
        {
          id: "integration" as Id<"integrations">,
          tools: ["read", "search"],
        },
      ],
      web: true,
    },
    artifactId: "artifact" as Id<"artifacts">,
    instructions: "Prepare the meeting.",
    name: "Prep",
    principal: { kind: "person", personId: "person" as Id<"persons"> },
    scope: "personal",
    type: "cron",
    trigger: {
      expression: "0 8 * * *",
      timezone: "Europe/Stockholm",
      nextAt: 123,
    },
  } as Doc<"automations">
}
