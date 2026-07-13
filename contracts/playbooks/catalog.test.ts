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
  allowsDeliveryChoice,
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

const meetingBriefing = getPlaybook("meeting-briefing")

function meetingOptions(values: Record<string, string | number> = {}) {
  return resolvePlaybookOptions(meetingBriefing.options, values)
}

describe("Meeting Briefing configuration", () => {
  test("has focused defaults and the capabilities research can use", () => {
    expect(meetingBriefing.title).toBe("Meeting Briefing")
    expect(meetingOptions()).toMatchObject({
      meetings: "external",
      digest: "on",
      time: "07:30",
      before: "off",
    })
    expect(meetingBriefing.agentWait).toEqual({ unit: "minutes", value: 15 })
    expect(meetingBriefing.slots).toEqual([
      { capability: "email", intents: ["read"] },
      { capability: "calendar", intents: ["read"] },
    ])
    expect(meetingBriefing.web).toBe(true)
  })

  test("starts research with margin before the chosen delivery time", () => {
    expect(resolvePlaybookSchedule(meetingBriefing, meetingOptions())).toEqual({
      repeat: "daily",
      time: "07:00",
    })
    expect(
      resolvePlaybookSchedule(
        meetingBriefing,
        meetingOptions({ time: "00:05" })
      )
    ).toEqual({ repeat: "daily", time: "23:35" })
  })
})

describe("Meeting Briefing cadence", () => {
  test("without a digest the planning sweep stays early", () => {
    expect(
      resolvePlaybookSchedule(
        meetingBriefing,
        meetingOptions({
          digest: "off",
          before: "45",
        })
      )
    ).toEqual({ repeat: "daily", time: "01:00" })
  })

  test("cadence copy follows the chosen options", () => {
    expect(describePlaybookCadence(meetingBriefing, meetingOptions())).toBe(
      "Morning digest at 07:30"
    )
    expect(
      describePlaybookCadence(meetingBriefing, meetingOptions({ before: "45" }))
    ).toBe("Morning digest at 07:30, briefing 45 minutes before each meeting")
    expect(
      describePlaybookCadence(
        meetingBriefing,
        meetingOptions({
          digest: "off",
          before: "45",
        })
      )
    ).toBe("Briefing 45 minutes before each meeting")
  })

  test("at least one delivery must stay on", () => {
    expect(
      meetingBriefing.validateOptions?.(
        meetingOptions({ digest: "off", before: "off" })
      )
    ).toBe("Turn on the morning digest or a pre-meeting send.")
    expect(
      meetingBriefing.validateOptions?.(
        meetingOptions({ digest: "off", before: "45" })
      )
    ).toBe(undefined)
    expect(
      meetingBriefing.validateOptions?.(meetingOptions({ before: "off" }))
    ).toBe(undefined)
  })

  test("browse surfaces get the rhythm, not resolved defaults", () => {
    expect(describePlaybookCadence(meetingBriefing)).toBe(
      "Morning briefing or before each meeting"
    )
  })
})

describe("Meeting Briefing delivery", () => {
  test("offers private destinations but rejects Slack channels", () => {
    expect(meetingBriefing.delivery).toMatchObject({
      allowed: ["email", "slack"],
      slackTargets: ["dm"],
      noun: "briefing",
      style: "summary",
    })
    expect(
      allowsDeliveryChoice(meetingBriefing.delivery, {
        kind: "slack",
        target: { kind: "dm" },
      })
    ).toBe(true)
    expect(
      allowsDeliveryChoice(meetingBriefing.delivery, {
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
