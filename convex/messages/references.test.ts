import { expect, test } from "vitest"
import { tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { fileDoc, folderDoc, jobDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { createSight } from "../visibility/sight"
import { type ReferenceTarget, resolveReferenceTarget } from "./references"

const other = "persons:other" as Id<"persons">

async function seed() {
  const { database, ctx } = databaseContext()
  const financeId = await database.insert(
    "folders",
    folderDoc({ name: "Finance" })
  )
  const renewalsId = await database.insert(
    "folders",
    folderDoc({ name: "Renewals", parentId: financeId })
  )
  const tableId = await database.insert(
    "collections",
    tableDoc({ folderId: renewalsId, name: "Customer renewals" })
  )
  const jobId = await database.insert("jobs", jobDoc({ name: "Digest" }))
  const secretId = await database.insert(
    "files",
    fileDoc({ name: "secret.csv", visibility: { mode: "private" } })
  )
  const runId = await database.insert("runs", {
    organizationId: "org",
    audience: "person",
    createdBy: testOwner,
    status: "completed",
    snapshot: { title: "Chase the unpaid renewals", context: [], source: {} },
    cause: { type: "manual" },
    createdAt: 1,
  })
  const foreignRunId = await database.insert("runs", {
    organizationId: "elsewhere",
    audience: "organization",
    status: "running",
    snapshot: { title: "Not ours", context: [], source: {} },
    cause: { type: "manual" },
    createdAt: 1,
  })
  const sightOf = (personId: Id<"persons">) =>
    createSight(ctx, { organizationId: "org", personId })
  const resolveAs = (personId: Id<"persons">, target: ReferenceTarget) =>
    resolveReferenceTarget(ctx, sightOf(personId), target)

  return {
    foreignRunId,
    jobId,
    renewalsId,
    resolveAs,
    runId,
    secretId,
    tableId,
  }
}

test("names what the viewer may see, with where it is filed", async () => {
  const { jobId, renewalsId, resolveAs, tableId } = await seed()

  expect(await resolveAs(other, { kind: "table", id: tableId })).toEqual({
    kind: "table",
    id: tableId,
    name: "Customer renewals",
    detail: "Finance › Renewals",
    unavailable: false,
  })
  expect(await resolveAs(other, { kind: "job", id: jobId })).toEqual({
    kind: "job",
    id: jobId,
    name: "Digest",
    detail: undefined,
    unavailable: false,
  })
  // A folder's detail is the folders above it, not itself.
  expect(await resolveAs(other, { kind: "folder", id: renewalsId })).toEqual({
    kind: "folder",
    id: renewalsId,
    name: "Renewals",
    detail: "Finance",
    unavailable: false,
  })
})

test("a run resolves to its title and status for those who may see it", async () => {
  const { foreignRunId, resolveAs, runId } = await seed()

  expect(await resolveAs(testOwner, { kind: "run", id: runId })).toEqual({
    kind: "run",
    id: runId,
    name: "Chase the unpaid renewals",
    detail: "completed",
    unavailable: false,
  })
  // A personal run is its creator's alone; a foreign run is nobody's.
  expect(await resolveAs(other, { kind: "run", id: runId })).toMatchObject({
    unavailable: true,
  })
  expect(
    await resolveAs(testOwner, { kind: "run", id: foreignRunId })
  ).toMatchObject({ unavailable: true })
})

test("invisible, missing, and mistyped targets come back unavailable without a name", async () => {
  const { resolveAs, secretId, tableId } = await seed()
  const gone = { kind: "file", id: "files:404" } as const

  expect(await resolveAs(other, { kind: "file", id: secretId })).toEqual({
    kind: "file",
    id: secretId,
    name: "",
    unavailable: true,
  })
  expect(
    await resolveAs(testOwner, { kind: "file", id: secretId })
  ).toMatchObject({ name: "secret.csv", unavailable: false })
  expect(await resolveAs(other, gone)).toEqual({
    ...gone,
    name: "",
    unavailable: true,
  })
  // A table's id offered as a store is not a store.
  expect(await resolveAs(other, { kind: "store", id: tableId })).toMatchObject({
    unavailable: true,
  })
  expect(
    await resolveAs(other, { kind: "job", id: "not-an-id" })
  ).toMatchObject({ unavailable: true })
})
