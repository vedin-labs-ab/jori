import { expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { tableDoc, testOwner } from "../../test/convex/materials/collections"
import { fileDoc, folderDoc, jobDoc } from "../../test/convex/materials/folders"
import { type Id } from "../_generated/dataModel"
import { createSight } from "../visibility/sight"
import {
  type ReferenceTarget,
  resolveConsoleContext,
  resolveReferenceTarget,
} from "./references"

const other = "persons:other" as Id<"persons">

async function seed() {
  const { database, ctx } = databaseContext()
  const filed = await seedFiled(database)
  const runId = await run(database, {
    organizationId: "org",
    audience: "person",
    createdBy: testOwner,
    status: "completed",
    title: "Chase the unpaid renewals",
  })
  const foreignRunId = await run(database, {
    organizationId: "elsewhere",
    audience: "organization",
    status: "running",
    title: "Not ours",
  })
  const chatId = await database.insert("conversations", {
    organizationId: "org",
    surface: "console",
    visibility: { mode: "private" },
    externalId: "",
    scope: "person",
    title: "Which renewals are at risk?",
    createdBy: testOwner,
    updatedAt: 1,
  })
  const sightOf = (personId: Id<"persons">) =>
    createSight(ctx, { organizationId: "org", personId })
  const resolveAs = (personId: Id<"persons">, target: ReferenceTarget) =>
    resolveReferenceTarget(ctx, sightOf(personId), target)
  const resolveContextAs = (personId: Id<"persons">, data: unknown) =>
    resolveConsoleContext(ctx, sightOf(personId), data)

  return {
    ...filed,
    chatId,
    ctx,
    foreignRunId,
    resolveAs,
    resolveContextAs,
    runId,
  }
}

/** A table filed two folders deep, a job, and a private file. */
async function seedFiled(database: TestDatabase) {
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

  return { financeId, jobId, renewalsId, secretId, tableId }
}

async function run(
  database: TestDatabase,
  run: {
    organizationId: string
    audience: "organization" | "person"
    createdBy?: Id<"persons">
    status: "completed" | "running"
    title: string
  }
) {
  const { title, ...fields } = run

  return await database.insert("runs", {
    ...fields,
    snapshot: { title, context: [], source: {} },
    cause: { type: "manual" },
    createdAt: 1,
  })
}

test("names what the viewer may see, with where it is filed", async () => {
  const { financeId, jobId, renewalsId, resolveAs, tableId } = await seed()

  expect(await resolveAs(other, { kind: "table", id: tableId })).toEqual({
    kind: "table",
    id: tableId,
    name: "Customer renewals",
    detail: "Finance › Renewals",
    folderId: renewalsId,
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
    folderId: financeId,
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

test("a chat resolves for the person whose it is, and for nobody else", async () => {
  const { chatId, resolveAs } = await seed()
  const target = { kind: "chat", id: chatId } as const

  expect(await resolveAs(testOwner, target)).toEqual({
    ...target,
    name: "Which renewals are at risk?",
    detail: "Chat",
    unavailable: false,
  })
  expect(await resolveAs(other, target)).toMatchObject({ unavailable: true })
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

test("a filed resource's context resolves to its name and folder; a folder's to itself", async () => {
  const { financeId, renewalsId, resolveContextAs, tableId } = await seed()

  expect(
    await resolveContextAs(testOwner, {
      context: { kind: "table", id: tableId },
    })
  ).toEqual({
    kind: "table",
    id: tableId,
    name: "Customer renewals",
    folderId: renewalsId,
  })
  expect(
    await resolveContextAs(testOwner, {
      context: { kind: "folder", id: financeId },
    })
  ).toEqual({
    kind: "folder",
    id: financeId,
    name: "Finance",
    folderId: financeId,
  })
})

test("a context the person may not see, or no context, resolves to nothing", async () => {
  const { resolveContextAs, secretId } = await seed()

  expect(
    await resolveContextAs(other, { context: { kind: "file", id: secretId } })
  ).toBeUndefined()
  expect(
    await resolveContextAs(testOwner, {
      context: { kind: "file", id: secretId },
    })
  ).toMatchObject({ name: "secret.csv" })
  expect(await resolveContextAs(testOwner, undefined)).toBeUndefined()
  expect(
    await resolveContextAs(testOwner, { context: { kind: "video" } })
  ).toBeUndefined()
})
