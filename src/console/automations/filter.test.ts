import { expect, test } from "vitest"
import { filterAutomationsByView, hasAutomationFilters } from "./filter"
import { type Automation } from "./types"

test("defaults to active automations without treating the view as a filter", () => {
  expect(hasAutomationFilters("", "active")).toBe(false)
  expect(
    filterAutomationsByView(automations(), "active").map((item) => item.name)
  ).toEqual(["Active"])
})

test("shows every returned automation in the all view", () => {
  expect(hasAutomationFilters("", "all")).toBe(true)
  expect(
    filterAutomationsByView(automations(), "all").map((item) => item.name)
  ).toEqual(["Active", "Paused", "Completed"])
})

test("shows only paused automations in the paused view", () => {
  expect(hasAutomationFilters("", "paused")).toBe(true)
  expect(
    filterAutomationsByView(automations(), "paused").map((item) => item.name)
  ).toEqual(["Paused"])
})

function automations(): Automation[] {
  return [
    automation("Active", "active"),
    automation("Paused", "paused"),
    automation("Completed", "completed"),
  ]
}

function automation(name: string, status: Automation["status"]) {
  return {
    name,
    status,
  } as Automation
}
