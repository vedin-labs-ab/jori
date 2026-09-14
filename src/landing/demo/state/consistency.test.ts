import assert from "node:assert/strict"
import { expect, test } from "vitest"
import {
  fileOwner,
  materialOwner,
  summaryOwner,
} from "@/shared/console/materials/owners"
import { resolveAudience } from "../derive/audience"
import { resolveReference } from "../derive/chat"
import { folderContents, rootFolders } from "../derive/folders"
import { fileRows, storeSummaries, tableSummaries } from "../derive/materials"
import { mentionSources } from "../derive/mentions"
import { runViews } from "../derive/runs"
import { usageOverview, usageSpend } from "../derive/usage"
import { folderId } from "../fixtures/folders"
import { jobId } from "../fixtures/jobs"
import { people, personId, viewerId } from "../fixtures/people"
import { createWorkspace, reduceWorkspace } from "./index"

const now = Date.UTC(2026, 8, 14, 8)

test("folder rows, material pages, and references agree on each record's identity and owner", () => {
  const state = createWorkspace(now)
  const views = [
    ...tableSummaries(state).map((row) => ({
      id: row.tableId,
      row,
      owner: summaryOwner(row),
    })),
    ...storeSummaries(state).map((row) => ({
      id: row.storeId,
      row,
      owner: summaryOwner(row),
    })),
    ...fileRows(state).map((row) => ({
      id: row.fileId,
      row,
      owner: fileOwner(row),
    })),
    ...state.jobs.map((row) => ({
      id: row.id,
      row,
      owner: materialOwner(row),
    })),
  ]
  for (const folder of state.folders) {
    const contents = folderContents(state, folder.folderId)
    for (const resource of contents.resources) {
      const view = views.find((view) => view.id === resource.id)
      assert(view, resource.name)
      expect(resource, resource.name).toMatchObject({
        name: view.row.name,
        visibility: view.row.visibility,
        updatedAt: view.row.updatedAt,
      })
      expect(materialOwner(resource), resource.name).toEqual(view.owner)
      expect(
        resolveReference(state, { kind: resource.type, id: resource.id })?.name
      ).toBe(resource.name)
    }
    const listed =
      folder.parentId === undefined
        ? rootFolders(state).folders
        : folderContents(state, folder.parentId).folders
    expect(
      listed.find((row) => row.folderId === folder.folderId)?.resourceCount
    ).toBe(contents.resources.length)
  }
})

test("fixture ids and person, folder, job, and usage references resolve uniquely", () => {
  const state = createWorkspace(now)
  const resources = mentionSources(state).resources
  expect(new Set(resources.map((row) => row.id)).size).toBe(resources.length)
  const personIds = new Set(people.map((person) => person.id))
  const folders = new Set(state.folders.map((folder) => folder.folderId))
  for (const record of [...state.jobs, ...state.materials]) {
    if (record.ownerId !== undefined) {
      expect(personIds.has(record.ownerId)).toBe(true)
    }
    if (record.folderId !== undefined) {
      expect(folders.has(record.folderId)).toBe(true)
    }
  }
  for (const run of state.runs) {
    if (run.jobId !== undefined) {
      expect(state.jobs.some((job) => job.id === run.jobId)).toBe(true)
    }
  }
  for (const row of state.usage) {
    if (row.folderId !== undefined) {
      expect(folders.has(row.folderId)).toBe(true)
    }
    if (row.job !== undefined) {
      const job = state.jobs.find((job) => job.id === row.job?.id)
      expect(job?.name).toBe(row.job.label)
      expect(job?.folderId).toBe(row.folderId)
    }
  }
})

test("private and restricted job audiences include their owner, as do new drafts", () => {
  const state = createWorkspace(now)
  for (const job of state.jobs) {
    expect(
      resolveAudience(
        state,
        { kind: "job", id: job.id },
        { mode: "private" }
      ).people.map((person) => person.personId)
    ).toEqual([job.ownerId])
    expect(
      resolveAudience(
        state,
        { kind: "job", id: job.id },
        { mode: "people", personIds: [personId("maya")] }
      ).people.map((person) => person.personId)
    ).toContain(job.ownerId)
  }
  expect(
    resolveAudience(
      state,
      { kind: "draft", folderId: folderId("design") },
      { mode: "private" }
    ).people.map((person) => person.personId)
  ).toEqual([viewerId])
})

test("renaming and removing a job updates every live link while preserving run history and spend", () => {
  const initial = createWorkspace(now)
  const job = initial.jobs.find((job) => job.id === jobId("triage"))
  assert(job)
  assert(job.folderId)
  const originalRun = runViews(initial).find((run) => run.job?.id === job.id)
  assert(originalRun)
  expect(originalRun).toBeDefined()
  const renamed = reduceWorkspace(initial, {
    type: "updateJob",
    job: { ...job, name: "Updated triage", updatedAt: now + 1 },
  })
  const run = runViews(renamed).find((run) => run.id === originalRun.id)
  assert(run)
  expect(run.job?.name).toBe("Updated triage")
  expect(run.title).toBe(originalRun.title)
  expect(run.task).toBe(originalRun.task)
  expect(run.result).toBe(originalRun.result)
  expect(
    folderContents(renamed, job.folderId).resources.find(
      (row) => row.id === job.id
    )?.name
  ).toBe("Updated triage")
  expect(resolveReference(renamed, { kind: "job", id: job.id })?.name).toBe(
    "Updated triage"
  )
  expect(
    mentionSources(renamed).resources.find((row) => row.id === job.id)?.name
  ).toBe("Updated triage")
  expect(
    usageOverview(renamed, undefined, 30).jobs.find((row) => row.id === job.id)
      ?.label
  ).toBe(job.name)
  const removed = reduceWorkspace(renamed, { type: "deleteJob", jobId: job.id })
  expect(
    runViews(removed).find((run) => run.id === originalRun.id)?.job
  ).toBeNull()
  expect(resolveReference(removed, { kind: "job", id: job.id })).toBeUndefined()
  expect(
    usageOverview(removed, undefined, 30).jobs.find(
      (row) => row.label === job.name
    )?.id
  ).toBeUndefined()
  expect(usageSpend(removed, undefined)).toBe(usageSpend(initial, undefined))
})

test.each([false, true])(
  "deleting folders preserves all historical spend and removes dead folder references (delete resources: %s)",
  (deleteResources) => {
    const initial = createWorkspace(now)
    const parent = folderId("finance")
    const removed = reduceWorkspace(initial, {
      type: "deleteFolder",
      folderId: folderId("renewals"),
      deleteResources,
    })
    expect(usageSpend(removed, parent)).toBe(usageSpend(initial, parent))
    expect(usageSpend(removed, undefined)).toBe(usageSpend(initial, undefined))
    const survivingFolders = new Set(
      removed.folders.map((folder) => folder.folderId)
    )
    for (const row of removed.usage) {
      if (row.folderId !== undefined) {
        expect(survivingFolders.has(row.folderId)).toBe(true)
      }
    }
  }
)
