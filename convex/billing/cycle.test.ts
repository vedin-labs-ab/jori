import { expect, test } from "vitest"
import { addMonths } from "./cycle"

const utc = (
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 30
) => Date.UTC(year, month - 1, day, hour, minute)

test("keeps the anchor day and time across ordinary months", () => {
  expect(addMonths(utc(2026, 7, 19), 1)).toBe(utc(2026, 8, 19))
})

test("clamps a late anchor to shorter months", () => {
  expect(addMonths(utc(2026, 1, 31), 1)).toBe(utc(2026, 2, 28))
  expect(addMonths(utc(2024, 1, 31), 1)).toBe(utc(2024, 2, 29))
})

test("rolls across year ends", () => {
  expect(addMonths(utc(2026, 12, 15), 1)).toBe(utc(2027, 1, 15))
})
