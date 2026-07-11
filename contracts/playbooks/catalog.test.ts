import { describe, expect, test } from "vitest"
import { getToolPermission } from "../permissions"
import { playbookCapabilityProviders, playbookSlotTools } from "./capabilities"
import {
  describePlaybookCadence,
  getPlaybook,
  playbookCatalog,
  resolvePlaybookSchedule,
} from "./catalog"
import {
  type DeliveryDestination,
  type DeliveryKind,
  destinationTools,
} from "./delivery"
import { resolvePlaybookOptions } from "./options"

function sampleDestination(kind: DeliveryKind): DeliveryDestination {
  return kind === "email"
    ? { kind: "email", integration: "gmail", address: "me@example.com" }
    : { kind: "slack", channelId: "C1", channelName: "general" }
}

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

  test("every allowed delivery grants exactly its write send tools", () => {
    for (const playbook of playbookCatalog) {
      expect(playbook.delivery.allowed).toContain(playbook.delivery.default)
      expect(playbook.delivery.noun.length).toBeGreaterThan(0)

      for (const kind of playbook.delivery.allowed) {
        const tools = destinationTools(sampleDestination(kind))

        expect(tools.length).toBeGreaterThan(0)
        for (const tool of tools) {
          expect(getToolPermission(tool)?.access).toBe("write")
        }
      }
    }
  })
})

describe("meeting prep catalog", () => {
  const meetingPrep = getPlaybook("meeting-prep")

  function options(values: Record<string, string | number> = {}) {
    return resolvePlaybookOptions(meetingPrep.options, values)
  }

  test("digest mode runs the sweep ahead of the chosen delivery time", () => {
    expect(resolvePlaybookSchedule(meetingPrep, options())).toEqual({
      repeat: "daily",
      time: "07:15",
    })
    expect(
      resolvePlaybookSchedule(meetingPrep, options({ time: "00:05" }))
    ).toEqual({ repeat: "daily", time: "23:50" })
  })

  test("per-meeting mode keeps the early planning sweep", () => {
    expect(
      resolvePlaybookSchedule(meetingPrep, options({ mode: "meeting" }))
    ).toEqual({ repeat: "daily", time: "01:00" })
  })

  test("cadence copy follows the chosen options", () => {
    expect(describePlaybookCadence(meetingPrep)).toBe(
      "Morning digest at 07:30, reminders 30 minutes before meetings"
    )
    expect(
      describePlaybookCadence(meetingPrep, options({ reminders: "off" }))
    ).toBe("Morning digest at 07:30")
    expect(
      describePlaybookCadence(meetingPrep, options({ mode: "meeting" }))
    ).toBe("45 minutes before each external meeting")
  })
})
