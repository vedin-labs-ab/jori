import { expect, test } from "vitest"
import {
  createLocalPromptTime,
  createPromptTime,
  formatAge,
  formatMonth,
} from "./time"

const minuteMs = 60_000
const hourMs = 60 * minuteMs
const dayMs = 24 * hourMs

test("formats the UTC weekday and second-precision timestamp", () => {
  expect(createPromptTime(new Date("2026-06-12T07:30:00.123Z"))).toBe(
    "Friday, 2026-06-12T07:30:00Z"
  )
})

test("formats local time in an IANA zone with its offset", () => {
  const now = new Date("2026-07-11T19:16:00Z")

  expect(createLocalPromptTime("Europe/Stockholm", now)).toBe(
    "Saturday, 2026-07-11 21:16 Europe/Stockholm (GMT+2)"
  )
  expect(createLocalPromptTime("America/New_York", now)).toBe(
    "Saturday, 2026-07-11 15:16 America/New_York (GMT-4)"
  )
  expect(createLocalPromptTime("Not/AZone", now)).toBeNull()
})

test("formats ages across the whole scale", () => {
  expect(formatAge(30_000)).toBe("just now")
  expect(formatAge(minuteMs)).toBe("1 minute ago")
  expect(formatAge(19 * minuteMs)).toBe("19 minutes ago")
  expect(formatAge(3 * hourMs)).toBe("3 hours ago")
  expect(formatAge(2 * dayMs)).toBe("2 days ago")
  expect(formatAge(13 * dayMs)).toBe("1 week ago")
  expect(formatAge(30 * dayMs)).toBe("4 weeks ago")
  expect(formatAge(60 * dayMs)).toBe("2 months ago")
  expect(formatAge(400 * dayMs)).toBe("1 year ago")
})

test("formats UTC month and year", () => {
  expect(formatMonth(Date.UTC(2026, 3, 10))).toBe("April 2026")
  expect(formatMonth(Date.UTC(2025, 11, 31))).toBe("December 2025")
})
