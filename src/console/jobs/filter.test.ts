import { expect, test } from "vitest"
import { filterJobsByView, hasJobFilters } from "./filter"
import { type Job } from "./types"

test("defaults to active jobs without treating the view as a filter", () => {
  expect(hasJobFilters("", "active")).toBe(false)
  expect(filterJobsByView(jobs(), "active").map((item) => item.name)).toEqual([
    "Active",
  ])
})

test("shows every returned job in the all view", () => {
  expect(hasJobFilters("", "all")).toBe(true)
  expect(filterJobsByView(jobs(), "all").map((item) => item.name)).toEqual([
    "Active",
    "Paused",
    "Completed",
  ])
})

test("shows only paused jobs in the paused view", () => {
  expect(hasJobFilters("", "paused")).toBe(true)
  expect(filterJobsByView(jobs(), "paused").map((item) => item.name)).toEqual([
    "Paused",
  ])
})

function jobs(): Job[] {
  return [
    job("Active", "active"),
    job("Paused", "paused"),
    job("Completed", "completed"),
  ]
}

function job(name: string, status: Job["status"]) {
  return {
    name,
    status,
  } as Job
}
