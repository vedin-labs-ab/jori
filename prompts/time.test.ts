import { expect, test } from "vitest"
import { createPromptTime } from "./time"

test("formats the UTC weekday and second-precision timestamp", () => {
  expect(createPromptTime(new Date("2026-06-12T07:30:00.123Z"))).toBe(
    "Friday, 2026-06-12T07:30:00Z"
  )
})
