import { describe, expect, test } from "vitest"
import { type Integration, integrationLabels } from "../integrations"
import { getToolPermission } from "../permissions"
import {
  type PlaybookCapability,
  playbookCapabilityProviders,
  playbookSlotTools,
} from "./capabilities"
import { playbookCatalog } from "./catalog"

const recipient = { email: "sam@example.com", name: "Sam Doe" }

const providerFamilies = [
  { email: "gmail", calendar: "googleCalendar" },
  { email: "microsoftEmail", calendar: "microsoftCalendar" },
] satisfies Record<PlaybookCapability, Integration>[]

describe("playbook catalog", () => {
  test("keys are unique and kebab-case", () => {
    const keys = playbookCatalog.map((playbook) => playbook.key)

    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) {
      expect(key).toMatch(/^[a-z]+(-[a-z]+)*$/)
    }
  })

  test("slot capabilities are unique per playbook", () => {
    for (const playbook of playbookCatalog) {
      const capabilities = playbook.slots.map((slot) => slot.capability)

      expect(new Set(capabilities).size).toBe(capabilities.length)
    }
  })

  test("every slot resolves to real tools for every provider", () => {
    for (const playbook of playbookCatalog) {
      for (const slot of playbook.slots) {
        for (const provider of playbookCapabilityProviders[slot.capability]) {
          const tools = playbookSlotTools(slot, provider)

          expect(tools.length).toBeGreaterThan(0)
          for (const tool of tools) {
            expect(getToolPermission(tool)?.surface).toBe(provider)
          }
        }
      }
    }
  })

  test("every playbook grants at least one write tool", () => {
    for (const playbook of playbookCatalog) {
      for (const family of providerFamilies) {
        const accesses = playbook.slots.flatMap((slot) =>
          playbookSlotTools(slot, family[slot.capability]).map(
            (tool) => getToolPermission(tool)?.access
          )
        )

        expect(accesses).toContain("write")
      }
    }
  })

  test("instructions mention each slot's provider and the recipient", () => {
    for (const playbook of playbookCatalog) {
      for (const family of providerFamilies) {
        const providers = {
          email: integrationLabels[family.email],
          calendar: integrationLabels[family.calendar],
        }
        const instructions = playbook.instructions({ providers, recipient })

        expect(instructions).not.toContain("undefined")
        expect(instructions).toContain(recipient.email)
        for (const slot of playbook.slots) {
          expect(instructions).toContain(providers[slot.capability])
        }
      }
    }
  })
})
