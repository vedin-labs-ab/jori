import { describe, expect, test } from "vitest"
import {
  isPlaybookOptionEnabled,
  type PlaybookSetupSection,
  playbookOptionFields,
  resolvePlaybookOptions,
} from "./options"

const setup: PlaybookSetupSection[] = [
  {
    key: "scope",
    kind: "fields",
    label: "Scope",
    fields: [
      {
        key: "scope",
        label: "Scope",
        kind: "choice",
        default: "external",
        choices: [
          { value: "external", label: "External" },
          { value: "all", label: "All" },
        ],
      },
    ],
  },
  {
    key: "timing",
    kind: "behaviors",
    label: "Timing",
    behaviors: [
      {
        key: "morning",
        label: "Morning briefing",
        enabledBy: {
          key: "morning",
          label: "Morning briefing",
          kind: "boolean",
          default: true,
        },
        fields: [
          {
            key: "morningTime",
            label: "Send at",
            kind: "time",
            default: "07:30",
            enabledWhen: { key: "morning", value: true },
          },
        ],
      },
      {
        key: "reminders",
        label: "Reminders",
        enabledBy: {
          key: "reminders",
          label: "Reminders",
          kind: "boolean",
          default: false,
        },
        fields: [
          {
            key: "remindBefore",
            label: "Send",
            kind: "minutes",
            default: 30,
            min: 5,
            max: 240,
            presets: [15, 30, 45, 60],
            enabledWhen: { key: "reminders", value: true },
          },
        ],
      },
    ],
  },
]

describe("playbook options", () => {
  test("defaults fill every key", () => {
    expect(resolvePlaybookOptions(setup)).toEqual({
      scope: "external",
      morning: true,
      morningTime: "07:30",
      reminders: false,
      remindBefore: 30,
    })
  })

  test("enabled fields take provided values", () => {
    expect(
      resolvePlaybookOptions(setup, {
        morningTime: "08:00",
        reminders: true,
        remindBefore: 15,
      })
    ).toMatchObject({
      morningTime: "08:00",
      reminders: true,
      remindBefore: 15,
    })
  })

  test("disabled fields revert to defaults", () => {
    expect(
      resolvePlaybookOptions(setup, {
        morning: false,
        morningTime: "09:00",
      })
    ).toMatchObject({ morning: false, morningTime: "07:30" })
  })

  test("enablement follows typed predicates", () => {
    const fields = playbookOptionFields(setup)
    const time = fields.find((field) => field.key === "morningTime")

    expect(time).toBeDefined()
    expect(
      time === undefined
        ? true
        : isPlaybookOptionEnabled(time, fields, { morning: false })
    ).toBe(false)
  })
})

describe("playbook option validation", () => {
  test("rejects invalid values, unknown keys, and duplicate fields", () => {
    expect(() => resolvePlaybookOptions(setup, { morning: "yes" })).toThrow(
      'Invalid value for playbook option "morning"'
    )
    expect(() =>
      resolvePlaybookOptions(setup, { morningTime: "7:30" })
    ).toThrow('Invalid value for playbook option "morningTime"')
    expect(() =>
      resolvePlaybookOptions(setup, { morningTime: "24:00" })
    ).toThrow('Invalid value for playbook option "morningTime"')
    expect(() => resolvePlaybookOptions(setup, { remindBefore: 3 })).toThrow(
      'Invalid value for playbook option "remindBefore"'
    )
    expect(() => resolvePlaybookOptions(setup, { remindBefore: 30.5 })).toThrow(
      'Invalid value for playbook option "remindBefore"'
    )
    expect(() => resolvePlaybookOptions(setup, { bogus: 1 })).toThrow(
      'Unknown playbook option "bogus"'
    )
    expect(() => playbookOptionFields([...setup, setup[0]])).toThrow(
      'Duplicate setup section "scope"'
    )
    expect(() =>
      playbookOptionFields([...setup, { ...setup[0], key: "scope-copy" }])
    ).toThrow('Duplicate playbook option "scope"')
    expect(() =>
      playbookOptionFields([...setup, { ...setup[1], key: "timing-copy" }])
    ).toThrow('Duplicate playbook behavior "morning"')
  })

  test("rejects dependencies on undeclared options", () => {
    const invalid: PlaybookSetupSection[] = [
      {
        key: "timing",
        kind: "fields",
        label: "Timing",
        fields: [
          {
            key: "time",
            label: "Send at",
            kind: "time",
            default: "07:30",
            enabledWhen: { key: "missing", value: true },
          },
        ],
      },
    ]

    expect(() => resolvePlaybookOptions(invalid)).toThrow(
      'Unknown option dependency "missing"'
    )
  })
})
