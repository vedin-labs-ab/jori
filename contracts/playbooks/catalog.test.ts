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

const meetingBriefing = getPlaybook("meeting-briefing")

function meetingBehavior(key: string): PlaybookBehavior {
  for (const section of meetingBriefing.setup ?? []) {
    if (section.kind === "behaviors") {
      const behavior = section.behaviors.find((entry) => entry.key === key)

      if (behavior !== undefined) {
        return behavior
      }
    }
  }

  throw new Error(`Meeting Briefing behavior "${key}" is missing.`)
}

function meetingOptions(
  values: Record<string, boolean | number | string> = {}
) {
  return resolvePlaybookOptions(meetingBriefing.setup, values)
}

describe("Meeting Briefing configuration", () => {
  test("has focused defaults and the capabilities research can use", () => {
    expect(meetingBriefing.title).toBe("Meeting Briefing")
    expect(meetingOptions()).toMatchObject({
      meetings: "external",
      morning: true,
      morningTime: "07:30",
      beforeMeeting: false,
      leadMinutes: "45",
    })
    expect(meetingBriefing.slots).toEqual([
      { capability: "email", intents: ["read"] },
      { capability: "calendar", intents: ["read"] },
    ])
    expect(meetingBriefing.web).toBe(true)

    const calendarSlot = meetingBriefing.slots.find(
      (slot) => slot.capability === "calendar"
    )
    if (calendarSlot === undefined) {
      throw new Error("Meeting Briefing calendar slot is missing.")
    }
    expect(playbookSlotTools(calendarSlot, "googleCalendar")).toContain(
      "google_calendar_list_calendars"
    )
    expect(playbookSlotTools(calendarSlot, "microsoftCalendar")).toContain(
      "microsoft_calendar_list_calendars"
    )
  })

  test("delivery copy distinguishes preparation from reminders", () => {
    const morning = meetingBehavior("morning-briefing")
    const before = meetingBehavior("before-meeting")

    expect(describePlaybookBehavior(morning, meetingOptions())).toBe(
      "Relevant meetings in one daily digest"
    )
    expect(before.label).toBe("Before meetings")
    expect(describePlaybookBehavior(before, meetingOptions())).toBe(
      "Resend the prepared dossier as a reminder"
    )
    expect(
      describePlaybookBehavior(before, meetingOptions({ morning: false }))
    ).toBe("Prepare and send each dossier just in time")
  })

  test("starts research with margin before the chosen delivery time", () => {
    expect(resolvePlaybookSchedule(meetingBriefing, meetingOptions())).toEqual({
      repeat: "daily",
      time: "07:00",
    })
    expect(
      resolvePlaybookSchedule(
        meetingBriefing,
        meetingOptions({ morningTime: "00:05" })
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
          morning: false,
          beforeMeeting: true,
        })
      )
    ).toEqual({ repeat: "daily", time: "01:00" })
  })

  test("cadence copy follows the chosen options", () => {
    expect(describePlaybookCadence(meetingBriefing, meetingOptions())).toBe(
      "Morning briefing at 07:30"
    )
    expect(
      describePlaybookCadence(
        meetingBriefing,
        meetingOptions({ beforeMeeting: true })
      )
    ).toBe("Morning briefing at 07:30, briefing 45 minutes before each meeting")
    expect(
      describePlaybookCadence(
        meetingBriefing,
        meetingOptions({
          morning: false,
          beforeMeeting: true,
        })
      )
    ).toBe("Briefing 45 minutes before each meeting")
  })

  test("at least one delivery must stay on", () => {
    expect(
      meetingBriefing.validateOptions?.(
        meetingOptions({ morning: false, beforeMeeting: false })
      )
    ).toBe("Choose at least one delivery time.")
    expect(
      meetingBriefing.validateOptions?.(
        meetingOptions({ morning: false, beforeMeeting: true })
      )
    ).toBe(undefined)
    expect(
      meetingBriefing.validateOptions?.(
        meetingOptions({ beforeMeeting: false })
      )
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
