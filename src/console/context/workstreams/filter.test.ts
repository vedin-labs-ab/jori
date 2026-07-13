import { expect, test } from "vitest"
import { filterWorkstreamsByView, hasWorkstreamFilters } from "./filter"
import { type Workstream, type Workstreams } from "./types"

test("defaults to active workstreams without treating the view as a filter", () => {
  expect(hasWorkstreamFilters("active")).toBe(false)
  expect(namesFor("active")).toEqual(["Proposed", "Confirmed"])
})

test("shows every workstream in its existing order in the all view", () => {
  expect(hasWorkstreamFilters("all")).toBe(true)
  expect(namesFor("all")).toEqual([
    "Proposed",
    "Archived",
    "Confirmed",
    "Rejected",
  ])
})

test("filters archived and rejected workstreams into their status views", () => {
  expect(hasWorkstreamFilters("closed")).toBe(true)
  expect(namesFor("closed")).toEqual(["Archived"])
  expect(namesFor("rejected")).toEqual(["Rejected"])
})

function namesFor(filter: Parameters<typeof filterWorkstreamsByView>[1]) {
  return filterWorkstreamsByView(workstreams(), filter).map(
    (workstream) => workstream.name
  )
}

function workstreams(): Workstreams {
  return [
    workstream("Proposed", "proposed"),
    workstream("Archived", "closed"),
    workstream("Confirmed", "confirmed"),
    workstream("Rejected", "rejected"),
  ] as Workstreams
}

function workstream(name: string, status: Workstream["status"]) {
  return { name, status } as Workstream
}
