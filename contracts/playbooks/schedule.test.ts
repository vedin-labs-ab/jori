import { describe, expect, test } from "vitest"
import { validateCronExpression } from "../automations/schedule/cron"
import { describePlaybookSchedule, playbookCron } from "./schedule"

describe("playbook schedules", () => {
  test("describes schedules in local terms", () => {
    expect(describePlaybookSchedule({ repeat: "daily", time: "08:00" })).toBe(
      "Daily at 08:00"
    )
    expect(
      describePlaybookSchedule({ repeat: "weekdays", time: "07:30" })
    ).toBe("Weekdays at 07:30")
    expect(
      describePlaybookSchedule({ repeat: "weekly", weekday: 5, time: "16:00" })
    ).toBe("Fridays at 16:00")
  })

  test("converts local times to UTC cron", () => {
    expect(playbookCron({ repeat: "daily", time: "08:00" }, 0)).toBe(
      "0 8 * * *"
    )
    // UTC+2 (offset -120): 08:00 local is 06:00 UTC.
    expect(playbookCron({ repeat: "weekdays", time: "08:00" }, -120)).toBe(
      "0 6 * * 1-5"
    )
    // UTC-5 (offset 300): 16:00 local is 21:00 UTC.
    expect(
      playbookCron({ repeat: "weekly", weekday: 5, time: "16:00" }, 300)
    ).toBe("0 21 * * 5")
  })

  test("shifts weekdays across midnight boundaries", () => {
    // UTC+2: 00:30 local weekdays land on 22:30 UTC the previous day.
    expect(playbookCron({ repeat: "weekdays", time: "00:30" }, -120)).toBe(
      "30 22 * * 0-4"
    )
    // UTC-10: 22:00 local Friday lands on 08:00 UTC Saturday.
    expect(
      playbookCron({ repeat: "weekly", weekday: 5, time: "22:00" }, 600)
    ).toBe("0 8 * * 6")
    // Sunday shifting back wraps to Saturday.
    expect(
      playbookCron({ repeat: "weekly", weekday: 0, time: "01:00" }, -120)
    ).toBe("0 23 * * 6")
  })

  test("produces valid cron expressions across offsets", () => {
    for (const offset of [-840, -120, 0, 300, 720]) {
      expect(() =>
        validateCronExpression(
          playbookCron({ repeat: "weekdays", time: "08:00" }, offset)
        )
      ).not.toThrow()
    }
  })
})
