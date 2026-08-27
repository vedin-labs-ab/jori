import { describe, expect, test } from "vitest"
import { digestPlaybook } from "../../test/playbooks"
import { getToolPermission } from "../permissions"
import { playbookCapabilityProviders, playbookSlotTools } from "./capabilities"
import {
  describePlaybookCadence,
  playbookCatalog,
  resolvePlaybookSchedule,
} from "./catalog"
import {
  allowsDeliveryChoice,
  type DeliveryDestination,
  type DeliveryKind,
  destinationTools,
} from "./delivery"
import {
  describePlaybookBehavior,
  type PlaybookBehavior,
  resolvePlaybookOptions,
} from "./options"

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

const digestBehavior = (key: string): PlaybookBehavior => {
  for (const section of digestPlaybook.setup ?? []) {
    if (section.kind === "behaviors") {
      const behavior = section.behaviors.find((entry) => entry.key === key)

      if (behavior !== undefined) {
        return behavior
      }
    }
  }

  throw new Error(`Digest behavior "${key}" is missing.`)
}

function digestOptions(values: Record<string, boolean | number | string> = {}) {
  return resolvePlaybookOptions(digestPlaybook.setup, values)
}

describe("behavior configuration", () => {
  test("resolves focused defaults from the setup sections", () => {
    expect(digestOptions()).toMatchObject({
      audience: "external",
      morning: true,
      morningTime: "07:30",
      reminders: false,
      leadMinutes: "45",
    })
  })

  test("behavior copy follows the chosen options", () => {
    const morning = digestBehavior("morning")
    const reminders = digestBehavior("reminders")

    expect(describePlaybookBehavior(morning, digestOptions())).toBe(
      "Everything relevant in one daily digest"
    )
    expect(describePlaybookBehavior(reminders, digestOptions())).toBe(
      "Resend before each deadline"
    )
    expect(
      describePlaybookBehavior(reminders, digestOptions({ morning: false }))
    ).toBe("Send each item just in time")
  })
})

describe("option-driven scheduling", () => {
  test("derives the schedule from the chosen options", () => {
    expect(resolvePlaybookSchedule(digestPlaybook, digestOptions())).toEqual({
      repeat: "daily",
      time: "07:00",
    })
    expect(
      resolvePlaybookSchedule(
        digestPlaybook,
        digestOptions({ morningTime: "00:05" })
      )
    ).toEqual({ repeat: "daily", time: "23:35" })
    expect(
      resolvePlaybookSchedule(
        digestPlaybook,
        digestOptions({ morning: false, reminders: true })
      )
    ).toEqual({ repeat: "daily", time: "01:00" })
  })

  test("cadence copy follows the chosen options", () => {
    expect(describePlaybookCadence(digestPlaybook, digestOptions())).toBe(
      "Morning digest at 07:30"
    )
    expect(
      describePlaybookCadence(
        digestPlaybook,
        digestOptions({ reminders: true })
      )
    ).toBe("Morning digest at 07:30, digest 45 minutes before each deadline")
    expect(
      describePlaybookCadence(
        digestPlaybook,
        digestOptions({ morning: false, reminders: true })
      )
    ).toBe("Digest 45 minutes before each deadline")
  })

  test("cross-field validation blocks impossible combinations", () => {
    expect(
      digestPlaybook.validateOptions?.(
        digestOptions({ morning: false, reminders: false })
      )
    ).toBe("Choose at least one delivery time.")
    expect(
      digestPlaybook.validateOptions?.(
        digestOptions({ morning: false, reminders: true })
      )
    ).toBe(undefined)
  })

  test("browse surfaces get the rhythm, not resolved defaults", () => {
    expect(describePlaybookCadence(digestPlaybook)).toBe("Daily or on demand")
  })
})

describe("delivery target restrictions", () => {
  test("a DM-only Slack contract rejects channels", () => {
    expect(digestPlaybook.delivery).toMatchObject({
      allowed: ["email", "slack"],
      slackTargets: ["dm"],
    })
    expect(
      allowsDeliveryChoice(digestPlaybook.delivery, {
        kind: "slack",
        target: { kind: "dm" },
      })
    ).toBe(true)
    expect(
      allowsDeliveryChoice(digestPlaybook.delivery, {
        kind: "slack",
        target: { kind: "channel", id: "C1", label: "team" },
      })
    ).toBe(false)
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
