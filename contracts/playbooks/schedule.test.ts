import { describe, expect, test } from "vitest"
import { validateCronExpression } from "../automations/schedule/cron"
import { describePlaybookSchedule, playbookCron } from "./schedule"

describe("playbook schedules", () => {
  test("describes schedules in local terms", () => {
    expect(describePlaybookSchedule({ repeat: "daily", time: "08:00" })).toBe(
      "Every day at 08:00"
    )
    expect(
      describePlaybookSchedule({ repeat: "weekdays", time: "07:30" })
    ).toBe("Every weekday at 07:30")
    expect(
      describePlaybookSchedule({ repeat: "weekly", weekday: 5, time: "16:00" })
    ).toBe("Every Friday at 16:00")
  })

  test("keeps schedules in local wall-clock terms", () => {
    expect(playbookCron({ repeat: "daily", time: "08:00" })).toBe("0 8 * * *")
    expect(playbookCron({ repeat: "weekdays", time: "00:30" })).toBe(
      "30 0 * * 1-5"
    )
    expect(playbookCron({ repeat: "weekly", weekday: 5, time: "16:00" })).toBe(
      "0 16 * * 5"
    )
  })

  test("produces valid cron expressions", () => {
    for (const time of ["00:00", "08:00", "23:59"]) {
      expect(() =>
        validateCronExpression(playbookCron({ repeat: "weekdays", time }))
      ).not.toThrow()
    }
  })
})
