import { describe, expect, test } from "vitest"
import {
  isPlaybookOptionEnabled,
  type PlaybookOptionField,
  resolvePlaybookOptions,
} from "./options"

const fields: PlaybookOptionField[] = [
  {
    key: "mode",
    label: "Delivery",
    kind: "choice",
    default: "digest",
    choices: [
      { value: "digest", label: "Morning digest" },
      { value: "meeting", label: "Before each meeting" },
    ],
  },
  {
    key: "time",
    label: "Deliver at",
    kind: "time",
    default: "07:30",
    enabledWhen: { key: "mode", value: "digest" },
  },
  {
    key: "reminders",
    label: "Reminders",
    kind: "choice",
    default: "on",
    choices: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
    enabledWhen: { key: "mode", value: "digest" },
  },
  {
    key: "remindBefore",
    label: "Remind before",
    kind: "minutes",
    default: 30,
    min: 5,
    max: 240,
    presets: [15, 30, 45, 60],
    enabledWhen: { key: "reminders", value: "on" },
  },
]

describe("playbook options", () => {
  test("defaults fill every key when nothing is provided", () => {
    expect(resolvePlaybookOptions(fields)).toEqual({
      mode: "digest",
      time: "07:30",
      reminders: "on",
      remindBefore: 30,
    })
  })

  test("enabled fields take the provided values", () => {
    expect(
      resolvePlaybookOptions(fields, { time: "08:00", remindBefore: 15 })
    ).toEqual({
      mode: "digest",
      time: "08:00",
      reminders: "on",
      remindBefore: 15,
    })
  })

  test("disabled fields revert to defaults", () => {
    expect(
      resolvePlaybookOptions(fields, { mode: "meeting", time: "09:00" })
    ).toEqual({
      mode: "meeting",
      time: "07:30",
      reminders: "on",
      remindBefore: 30,
    })
  })

  test("enablement chases predicates transitively", () => {
    const values = resolvePlaybookOptions(fields, {
      mode: "meeting",
      remindBefore: 60,
    })

    expect(values.remindBefore).toBe(30)
    expect(
      isPlaybookOptionEnabled(fields[3], fields, {
        mode: "meeting",
        reminders: "on",
      })
    ).toBe(false)
  })

  test("rejects invalid values and unknown keys", () => {
    expect(() => resolvePlaybookOptions(fields, { mode: "weekly" })).toThrow(
      'Invalid value for playbook option "mode"'
    )
    expect(() => resolvePlaybookOptions(fields, { time: "7:30" })).toThrow(
      'Invalid value for playbook option "time"'
    )
    expect(() => resolvePlaybookOptions(fields, { remindBefore: 3 })).toThrow(
      'Invalid value for playbook option "remindBefore"'
    )
    expect(() =>
      resolvePlaybookOptions(fields, { remindBefore: 30.5 })
    ).toThrow('Invalid value for playbook option "remindBefore"')
    expect(() => resolvePlaybookOptions(fields, { bogus: 1 })).toThrow(
      'Unknown playbook option "bogus"'
    )
  })
})
