import { expect, test, vi } from "vitest"
import { defaultSelection } from "../../contracts/models/selection"
import {
  consoleContext,
  organizationId,
  person,
  rows,
} from "../../test/convex/conversations"
import { folderDoc } from "../../test/convex/materials/folders"
import { type Doc } from "../_generated/dataModel"
import { removeFolder } from "../folders/records"
import { createInstructionRun } from "../runs/instruction"
import { recordUsageDebit } from "../usage/record"
import { sendConsoleMessage } from "./console"
import { purgeConversationBatch } from "./filing/delete"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

async function setup() {
  const { database, ctx, scheduler } = consoleContext()
  const pending: Parameters<typeof purgeConversationBatch>[1][] = []
  Object.assign(scheduler, {
    runAfter: vi.fn(
      async (
        _delay: number,
        _reference: unknown,
        args: Record<string, unknown>
      ) => {
        if ("externalId" in args) {
          pending.push(args as Parameters<typeof purgeConversationBatch>[1])
        }
        return "scheduled"
      }
    ),
  })
  const finishPurge = async () => {
    while (pending.length > 0) {
      const args = pending.shift()
      if (args !== undefined) {
        await purgeConversationBatch(ctx, args)
      }
    }
  }
  const personId = await person(database)
  const parentId = await database.insert("folders", folderDoc())
  const folderId = await database.insert("folders", folderDoc({ parentId }))
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Plan the launch.",
    folderId,
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")
  if (run === undefined) {
    throw new Error("Run missing")
  }
  return { database, ctx, personId, parentId, folderId, sent, run, finishPurge }
}

test.each([false, true])(
  "folder deletion retains chat accounting, delete contents: %s",
  async (deleteResources) => {
    const { database, ctx, parentId, folderId, sent, run, finishPurge } =
      await setup()
    await recordUsageDebit(ctx, {
      run,
      model: defaultSelection.model,
      micros: 100,
      tokens: { input: 10, output: 1 },
    })
    await removeFolder(ctx, { organizationId, folderId, deleteResources })
    await finishPurge()
    expect(await rows<Doc<"usage">>(database, "usage")).toMatchObject([
      { conversationId: sent.conversationId, folderId: parentId, micros: 100 },
    ])
    expect(await database.get(run._id)).toMatchObject({ folderId: parentId })
    if (deleteResources) {
      expect(await database.get(sent.conversationId)).toBeNull()
      expect(await rows(database, "messages")).toEqual([])
      expect(await rows(database, "sessions")).toEqual([])
      expect(await database.get(run._id)).toMatchObject({ status: "stopped" })
    } else {
      expect(await database.get(sent.conversationId)).toMatchObject({
        folderId: parentId,
      })
    }
  }
)

test("deleting a filed chat counts each delegated run once", async () => {
  const { database, ctx, personId, folderId, run, finishPurge } = await setup()
  const childId = await createInstructionRun(ctx, {
    organizationId,
    instructions: "Delegate.",
    parent: run,
    createdBy: personId,
  })
  const child = (await database.get(childId)) as Doc<"runs">
  await createInstructionRun(ctx, {
    organizationId,
    instructions: "Delegate again.",
    parent: child,
    createdBy: personId,
  })
  // Real query results are snapshots, even when another write changes a row.
  const query = database.query.bind(database)
  database.query = (table) => {
    const result = query(table)
    const paginate = result.paginate
    result.paginate = async (options) =>
      structuredClone(await paginate(options))
    return result
  }
  await removeFolder(ctx, { organizationId, folderId, deleteResources: true })
  await finishPurge()
  expect(
    (await rows<Doc<"runs">>(database, "runs")).map((row) => row.status)
  ).toEqual(["stopped", "stopped", "stopped"])
  expect(
    (await rows<Doc<"usage">>(database, "usage")).reduce(
      (total, row) => total + row.runs.ended,
      0
    )
  ).toBe(3)
})
