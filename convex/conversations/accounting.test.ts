import { expect, test, vi } from "vitest"
import { defaultSelection } from "../../contracts/models/selection"
import {
  consoleContext,
  finishRun,
  organizationId,
  person,
  rows,
} from "../../test/convex/conversations"
import { folderDoc } from "../../test/convex/folders"
import { type Doc } from "../_generated/dataModel"
import { fileResource } from "../folders/filing"
import { createInstructionRun } from "../runs/instruction"
import { recordUsageDebit, recordUsageEnded } from "../usage/record"
import { sendConsoleMessage } from "./console"
import { reconcileConversation } from "./filing/move"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

async function setup() {
  const { database, ctx, scheduler } = consoleContext()
  const personId = await person(database)
  const firstId = await database.insert("folders", folderDoc({ name: "First" }))
  const secondId = await database.insert(
    "folders",
    folderDoc({ name: "Second" })
  )
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Plan the launch.",
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")
  if (run === undefined) {
    throw new Error("Run missing")
  }
  const debit = (target: Doc<"runs">, micros: number) =>
    recordUsageDebit(ctx, {
      run: target,
      model: defaultSelection.model,
      micros,
      tokens: { input: micros, output: 1 },
    })
  const move = (folderId: typeof firstId | null) =>
    fileResource(ctx, {
      organizationId,
      personId,
      resourceType: "chat",
      resourceId: sent.conversationId,
      folderId,
    })
  return {
    database,
    ctx,
    scheduler,
    personId,
    firstId,
    secondId,
    sent,
    run,
    debit,
    move,
  }
}

test("moving a chat transfers its complete recorded history and leaves other chats unchanged", async () => {
  const { database, ctx, personId, firstId, secondId, sent, run, debit, move } =
    await setup()
  const other = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Unrelated chat.",
  })
  const otherRun = (await rows<Doc<"runs">>(database, "runs")).find(
    (candidate) => candidate.conversationId === other.conversationId
  )
  if (otherRun === undefined) {
    throw new Error("Run missing")
  }
  await debit(run, 100)
  await debit(otherRun, 40)
  await recordUsageEnded(ctx, { run, failed: true })
  await move(firstId)

  expect(await rows<Doc<"usage">>(database, "usage")).toMatchObject([
    {
      conversationId: sent.conversationId,
      folderId: firstId,
      micros: 100,
      runs: { ended: 1, failed: 1 },
    },
    { conversationId: other.conversationId, micros: 40 },
  ])
  // A provider debit carrying a run snapshot from before the move follows
  // the live chat even while older runs are still being refiled.
  await debit({ ...run, folderId: undefined }, 20)
  await move(secondId)
  await move(secondId)
  const usage = await rows<Doc<"usage">>(database, "usage")
  expect(
    usage.find((row) => row.conversationId === sent.conversationId)
  ).toMatchObject({
    folderId: secondId,
    micros: 120,
    runs: { ended: 1, failed: 1 },
  })
  expect(
    usage.find((row) => row.conversationId === other.conversationId)?.folderId
  ).toBeUndefined()
  expect(usage.reduce((total, row) => total + row.micros, 0)).toBe(160)
})

test("new and delegated runs follow chat filing and unfiling", async () => {
  const { database, ctx, personId, firstId, sent, run, debit, move } =
    await setup()
  await move(firstId)
  const childId = await createInstructionRun(ctx, {
    organizationId,
    instructions: "Research it.",
    parent: { ...run, folderId: undefined },
    createdBy: personId,
  })
  expect(await database.get(childId)).toMatchObject({
    conversationId: sent.conversationId,
    folderId: firstId,
  })
  const child = (await database.get(childId)) as Doc<"runs">
  const grandchildId = await createInstructionRun(ctx, {
    organizationId,
    instructions: "Check one detail.",
    parent: child,
    createdBy: personId,
  })
  expect(await database.get(grandchildId)).toMatchObject({
    conversationId: sent.conversationId,
    folderId: firstId,
  })
  await debit(child, 50)
  await finishRun(database)
  await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    conversationId: sent.conversationId,
    text: "Next step.",
  })
  expect(
    (await rows<Doc<"runs">>(database, "runs")).map((row) => row.folderId)
  ).toEqual([firstId, firstId, firstId, firstId])
  await move(null)
  expect(
    (await rows<Doc<"runs">>(database, "runs")).every(
      (row) => row.folderId === undefined
    )
  ).toBe(true)
  expect((await rows<Doc<"usage">>(database, "usage"))[0]).toMatchObject({
    conversationId: sent.conversationId,
    micros: 50,
  })
  expect(
    (await rows<Doc<"usage">>(database, "usage"))[0]?.folderId
  ).toBeUndefined()
})

test("a stale history batch cannot undo a newer move", async () => {
  const { database, ctx, firstId, secondId, sent, run, move } = await setup()
  const schedule = vi.fn(async () => "scheduled")
  Object.assign(ctx.scheduler, { runAfter: schedule })
  for (let index = 0; index < 105; index += 1) {
    const { _id, _creationTime, ...fields } = run
    await database.insert("runs", { ...fields, createdAt: index })
  }
  await move(firstId)
  expect(schedule).toHaveBeenCalled()
  await move(secondId)
  await reconcileConversation(ctx, {
    conversationId: sent.conversationId,
    folderId: firstId,
  })
  await reconcileConversation(ctx, {
    conversationId: sent.conversationId,
    folderId: secondId,
  })
  expect(
    (await rows<Doc<"runs">>(database, "runs")).every(
      (row) => row.folderId === secondId
    )
  ).toBe(true)
})
