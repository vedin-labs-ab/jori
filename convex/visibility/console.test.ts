import { type FunctionArgs } from "convex/server"
import { expect, test, vi } from "vitest"
import {
  consoleContext,
  organizationId,
  person,
} from "../../test/convex/conversations"
import { type api } from "../_generated/api"
import { type MutationCtx } from "../_generated/server"
import { createConsoleConversation } from "../conversations/console/create"
import { ensureCurrentPerson } from "../persons/account"
import { set } from "./console"

vi.mock("../persons/account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../persons/account")>()),
  ensureCurrentPerson: vi.fn(),
}))

const changeVisibility = (
  set as unknown as {
    _handler: (
      ctx: MutationCtx,
      args: FunctionArgs<typeof api.visibility.console.set>
    ) => Promise<null>
  }
)._handler

test("chat sharing uses the common owner-only visibility mutation", async () => {
  const { ctx, database } = consoleContext()
  const owner = await person(database)
  const member = await person(database)
  const conversation = await createConsoleConversation(ctx, {
    organizationId,
    personId: owner,
    text: "Planning",
    now: 1,
  })
  const args = {
    organizationId,
    target: { kind: "chat" as const, id: conversation._id },
    visibility: { mode: "organization" as const },
  }
  vi.mocked(ensureCurrentPerson).mockResolvedValue(member)
  await expect(changeVisibility(ctx, args)).rejects.toThrow("Not found.")
  vi.mocked(ensureCurrentPerson).mockResolvedValue(owner)
  await changeVisibility(ctx, args)
  expect(await database.get(conversation._id)).toMatchObject({
    visibility: { mode: "organization" },
    scope: "conversation",
  })
  vi.mocked(ensureCurrentPerson).mockResolvedValue(member)
  await expect(
    changeVisibility(ctx, { ...args, visibility: { mode: "private" } })
  ).rejects.toThrow("Only the owner")
})

vi.mock("../discovery/sync/intent", () => ({ mark: vi.fn() }))
