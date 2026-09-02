import { describe, expect, test } from "vitest"
import { describeCron } from "./labels"

describe("job labels", () => {
  test("describes supported cron shapes", () => {
    expect(describeCron("0 9 * * *")).toBe("Daily at 09:00 UTC")
    expect(describeCron("30 17 * * 1-5")).toBe("Weekdays at 17:30 UTC")
    expect(describeCron("0 9 * * 7")).toBe("Sundays at 09:00 UTC")
    expect(describeCron("15 6 3 * *")).toBe("Monthly on the 3rd at 06:15 UTC")
    expect(describeCron("*/5 * * * *")).toBe(null)
  })
})
