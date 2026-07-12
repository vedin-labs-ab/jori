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
    : {
        kind: "slack",
        target: { kind: "channel", id: "C1", label: "general" },
      }
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

  test("without a digest the planning sweep stays early", () => {
    expect(
      resolvePlaybookSchedule(meetingPrep, options({ digest: "off" }))
    ).toEqual({ repeat: "daily", time: "01:00" })
  })

  test("cadence copy follows the chosen options", () => {
    expect(describePlaybookCadence(meetingPrep, options())).toBe(
      "Morning digest at 07:30, prep 45 minutes before each meeting"
    )
    expect(
      describePlaybookCadence(meetingPrep, options({ before: "off" }))
    ).toBe("Morning digest at 07:30")
    expect(
      describePlaybookCadence(meetingPrep, options({ digest: "off" }))
    ).toBe("Prep 45 minutes before each meeting")
  })

  test("at least one delivery must stay on", () => {
    expect(
      meetingPrep.validateOptions?.(options({ digest: "off", before: "off" }))
    ).toBe("Turn on the morning digest or a pre-meeting send.")
    expect(meetingPrep.validateOptions?.(options({ digest: "off" }))).toBe(
      undefined
    )
    expect(meetingPrep.validateOptions?.(options({ before: "off" }))).toBe(
      undefined
    )
  })

  test("browse surfaces get the rhythm, not resolved defaults", () => {
    expect(describePlaybookCadence(meetingPrep)).toBe(
      "Morning digest or right before each meeting"
    )
  })
})

describe("catalog copy stays cadence-free where the rhythm rules", () => {
  test("cards never show clock times or counts", () => {
    for (const playbook of playbookCatalog) {
      expect(playbook.cadence).not.toMatch(/\d/)
      expect(playbook.description).not.toMatch(/\d/)
    }
  })
})
