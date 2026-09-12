import { afterEach, expect, test, vi } from "vitest"
import { transactionalConsoleContext } from "../../../test/convex/conversations"
import { listOrganizationViewerIds } from "../../visibility/audience"
import { recentConversation } from "../history/index"
import { sendConsoleMessage } from "./send"
import { transitionConversationVisibility } from "./sharing"

vi.mock("../../runs/execution/workflow", () => ({ startRun: vi.fn() }))
vi.mock("../../visibility/audience", () => ({
  listOrganizationViewerIds: vi.fn(),
}))
afterEach(() => vi.useRealTimers())

test("shared messages use common granted resources without importing the sender's private context", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  vi.mocked(listOrganizationViewerIds).mockResolvedValue(f.people)
  const resources = await shareResourceFixture(f)
  const sendReference = (id: string) =>
    f.t.run((ctx) =>
      sendConsoleMessage(ctx, {
        organizationId: "org",
        personId: f.people[0],
        profile: {},
        conversationId: f.conversationId,
        references: [{ kind: "table", id }],
        text: `Read +[table:${id}]`,
      })
    )
  await expect(sendReference(resources.privateId)).rejects.toThrow(
    "not available"
  )
  const sent = await sendReference(resources.commonId)
  await f.t.run(async (ctx) => {
    const message = await ctx.db.get(sent.messageId)
    if (message === null) {
      throw new Error("Missing message")
    }
    const history = await recentConversation(ctx, message, {
      kind: "organization",
    })
    expect(history.entries[0]?.context).not.toContain("Private launch details")
    expect(history.entries[1]?.context).toContain("Team launch plan")
    const runs = await ctx.db.query("runs").take(10)
    const shared = runs.find(
      (run) =>
        run.createdBy === f.people[0] && run.principal.kind === "organization"
    )
    if (shared === undefined) {
      throw new Error("Missing shared run")
    }
    expect(shared.snapshot.context).not.toContainEqual(
      expect.objectContaining({ label: "Private launch details" })
    )
  })
})

async function shareResourceFixture(
  f: Awaited<ReturnType<typeof transactionalConsoleContext>>
) {
  return await f.t.run(async (ctx) => {
    const base = {
      organizationId: "org",
      ownerId: f.people[0],
      kind: "table" as const,
      columns: [],
      schemaHash: "empty",
      createdAt: 1,
      updatedAt: 1,
    }
    const privateId = await ctx.db.insert("collections", {
      ...base,
      name: "Private launch details",
      visibility: { mode: "private" },
    })
    const commonId = await ctx.db.insert("collections", {
      ...base,
      name: "Team launch plan",
      visibility: { mode: "people", personIds: f.people },
    })
    await ctx.db.patch(f.messageId, {
      data: { context: { kind: "table", id: privateId } },
    })
    const conversation = await ctx.db.get(f.conversationId)
    if (conversation === null) {
      throw new Error("Missing fixture")
    }
    await transitionConversationVisibility(
      ctx,
      conversation,
      { mode: "organization" },
      f.people[0]
    )
    return { privateId, commonId }
  })
}
