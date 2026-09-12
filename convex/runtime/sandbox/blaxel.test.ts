import { beforeEach, expect, test, vi } from "vitest"
import { id } from "../../../test/convex/database"
import { type ActionCtx } from "../../_generated/server"
import { openSandbox } from "./blaxel"
import { connectSandbox, createSandbox, killSandbox } from "./support"

vi.mock("./support", () => ({
  connectSandbox: vi.fn(),
  createSandbox: vi.fn(),
  killSandbox: vi.fn(),
  sandboxName: (sandbox: { metadata: { name: string } }) =>
    sandbox.metadata.name,
}))
beforeEach(() => vi.clearAllMocks())

test("a stopped run cannot reconnect to its old sandbox", async () => {
  const ctx = { runQuery: vi.fn(async () => false) } as unknown as ActionCtx
  await expect(
    openSandbox(ctx, {
      runId: id<"runs">("old-run"),
      sandboxId: "private-sandbox",
    })
  ).rejects.toThrow("no longer active")
  expect(connectSandbox).not.toHaveBeenCalled()
  expect(createSandbox).not.toHaveBeenCalled()
})

test("a sandbox created during a stop is not handed back to the old step", async () => {
  vi.mocked(createSandbox).mockResolvedValue({
    metadata: { name: "late-sandbox" },
  } as Awaited<ReturnType<typeof createSandbox>>)
  const ctx = {
    runQuery: vi.fn(async () => true),
    runMutation: vi.fn(async () => false),
  } as unknown as ActionCtx
  await expect(
    openSandbox(ctx, { runId: id<"runs">("old-run"), sandboxId: null })
  ).rejects.toThrow("no longer active")
  expect(killSandbox).toHaveBeenCalledWith("late-sandbox")
})

test("a failed sandbox registration disposes of the unowned resource", async () => {
  vi.mocked(createSandbox).mockResolvedValue({
    metadata: { name: "unregistered" },
  } as Awaited<ReturnType<typeof createSandbox>>)
  const ctx = {
    runQuery: vi.fn(async () => true),
    runMutation: vi.fn(async () => {
      throw new Error("Run deleted")
    }),
  } as unknown as ActionCtx
  await expect(
    openSandbox(ctx, {
      runId: id<"runs">("deleted"),
      sandboxId: null,
    })
  ).rejects.toThrow("Run deleted")
  expect(killSandbox).toHaveBeenCalledWith("unregistered")
})
