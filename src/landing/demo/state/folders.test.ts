import { expect, test } from "vitest"
import { resolveReference } from "../derive/chat"
import { folderContents, folderImpact, rootFolders } from "../derive/folders"
import { usageSpend } from "../derive/usage"
import { chatRunMicros, renewalsConversationId } from "../fixtures/chat"
import { folderId } from "../fixtures/folders"
import { type FolderId } from "../fixtures/types"
import { createWorkspace, reduceWorkspace } from "./index"
import { type DemoState } from "./types"

const now = Date.UTC(2026, 8, 10, 8)

function fileChat(state: DemoState, destination: FolderId | null) {
  return reduceWorkspace(state, {
    type: "fileResource",
    at: now,
    resourceType: "chat",
    id: renewalsConversationId,
    folderId: destination,
  })
}

function startReply(state: DemoState, runId: string) {
  return reduceWorkspace(state, {
    type: "sendChatMessage",
    at: now,
    conversationId: renewalsConversationId,
    messageId: `${runId}-message`,
    runId,
    text: "Check the renewals",
    reply: { reasoning: "", text: "Done", parts: [] },
  })
}

test("filing a chat lists it privately and moves its historical spend without changing total usage", () => {
  const initial = createWorkspace(now)
  const destination = folderId("engineering")
  const before = usageSpend(initial, destination)
  const original = initial.chat.conversations[0]
  const filed = fileChat(initial, destination)

  expect(folderContents(filed, destination).resources).toContainEqual(
    expect.objectContaining({
      type: "chat",
      id: original.id,
      name: original.title,
      visibility: "private",
    })
  )
  const resourceCount = (state: DemoState) =>
    rootFolders(state).folders.find((folder) => folder.folderId === destination)
      ?.resourceCount
  expect(resourceCount(filed)).toBe((resourceCount(initial) ?? 0) + 1)
  expect(folderImpact(filed, destination).resourceCount).toBe(
    folderImpact(initial, destination).resourceCount + 1
  )
  expect(
    resolveReference(filed, { kind: "chat", id: original.id })?.detail
  ).toBe("Engineering")
  expect(usageSpend(filed, destination)).toBe(before + chatRunMicros)
  expect(usageSpend(filed, undefined)).toBe(usageSpend(initial, undefined))

  const moved = fileChat(filed, folderId("renewals"))
  expect(usageSpend(moved, destination)).toBe(before)
  expect(
    folderContents(moved, destination).resources.some(
      (row) => row.type === "chat"
    )
  ).toBe(false)

  const unfiled = fileChat(moved, null)
  expect(unfiled.chat.conversations[0]).toEqual({
    ...original,
    folderId: undefined,
  })
  expect(usageSpend(unfiled, folderId("renewals"))).toBe(
    usageSpend(initial, folderId("renewals"))
  )
})

test("deleting a folder either reparents its chats and costs or removes chats while keeping spent usage", () => {
  const initial = createWorkspace(now)
  const renewals = folderId("renewals")
  const finance = folderId("finance")
  const filed = startReply(fileChat(initial, renewals), "live")
  const remove = (deleteResources: boolean) =>
    reduceWorkspace(filed, {
      type: "deleteFolder",
      folderId: renewals,
      deleteResources,
    })

  const preserved = remove(false)
  expect(preserved.chat.conversations[0].folderId).toBe(finance)
  expect(preserved.chat.live?.run.id).toBe("live")
  expect(
    preserved.usage.find((row) => row.conversationId === renewalsConversationId)
      ?.folderId
  ).toBe(finance)

  const purged = remove(true)
  expect(purged.chat.conversations).toHaveLength(0)
  expect(purged.chat.live).toBeNull()
  expect(
    purged.usage.find((row) => row.conversationId === renewalsConversationId)
      ?.folderId
  ).toBeUndefined()
  expect(usageSpend(purged, undefined)).toBe(usageSpend(initial, undefined))
})

test("new replies charge their chat's folder once, including a stopped reply", () => {
  const destination = folderId("engineering")
  let state = fileChat(createWorkspace(now), destination)
  const before = usageSpend(state, destination)
  state = startReply(state, "finished")
  state = reduceWorkspace(state, { type: "advanceChatReply", at: now + 1000 })
  expect(state.chat.live).toBeNull()
  expect(usageSpend(state, destination)).toBe(before + chatRunMicros)
  state = reduceWorkspace(state, { type: "advanceChatReply", at: now + 2000 })
  expect(usageSpend(state, destination)).toBe(before + chatRunMicros)

  state = startReply(state, "stopped")
  state = reduceWorkspace(state, { type: "stopChatRun", at: now + 3000 })
  state = reduceWorkspace(state, { type: "stopChatRun", at: now + 4000 })
  expect(usageSpend(state, destination)).toBe(before + 2 * chatRunMicros)
  expect(
    state.usage
      .filter((row) => row.conversationId === renewalsConversationId)
      .reduce((sum, row) => sum + row.ended, 0)
  ).toBe(3)
})
