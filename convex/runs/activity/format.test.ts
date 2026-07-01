import { expect, test } from "vitest"
import { waiterReason } from "./format"

test("formats waiter reasons as compact metadata labels", () => {
  expect(waiterReason("cancelled")).toBe("Wait cancelled")
  expect(waiterReason("expired")).toBe("Wait expired")
  expect(waiterReason("message")).toBe("New input arrived")
  expect(waiterReason("resolved")).toBe("Handoff resolved")
})
