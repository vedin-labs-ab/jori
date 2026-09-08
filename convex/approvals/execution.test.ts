// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { getFunctionName } from "convex/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { approvalExecutionTimeoutMs } from "../../contracts/runtime/handoffs"
import {
  approvalFixture as fixture,
  approvalRunFields as runFields,
} from "../../test/approvals"
import { internal } from "../_generated/api"
import * as jori from "../broker/jori"
import { executeRunApproval } from "../runtime/tools/broker"

const success = JSON.stringify({ status: "read", text: "Synthetic fixture." })

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test("claims exclusively and preserves the first result until consumption", async () => {
  const { t, args } = await fixture()
  expect(
    await t.mutation(internal.approvals.execution.claim, args)
  ).toMatchObject({ state: "claim" })
  expect(await t.mutation(internal.approvals.execution.claim, args)).toEqual({
    state: "executing",
    expiresAt: Date.now() + approvalExecutionTimeoutMs,
  })
  expect(
    await t.mutation(internal.approvals.execution.record, {
      ...args,
      result: success,
    })
  ).toBe(success)
  expect(
    await t.mutation(internal.approvals.execution.record, {
      ...args,
      result: "late result",
    })
  ).toBe(success)
  expect(await t.mutation(internal.approvals.execution.claim, args)).toEqual({
    state: "done",
    result: success,
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(args.approvalId)))?.consumedAt
  ).toBeUndefined()
})

test("an expired claim becomes uncertain, never a new execution", async () => {
  const { t, args } = await fixture()
  await t.mutation(internal.approvals.execution.claim, args)
  vi.setSystemTime(Date.now() + approvalExecutionTimeoutMs)
  const outcome = (await t.mutation(
    internal.approvals.execution.claim,
    args
  )) as { state: string; result: string }
  expect(outcome.state).toBe("done")
  expect(JSON.parse(outcome.result)).toMatchObject({
    status: "error",
    error: { message: expect.stringContaining("may have taken effect") },
  })
  expect(
    await t.mutation(internal.approvals.execution.record, {
      ...args,
      result: success,
    })
  ).toBe(outcome.result)
  expect(await t.mutation(internal.approvals.execution.claim, args)).toEqual(
    outcome
  )
})

test("rejects unclaimed and wrong-run result writes", async () => {
  const { t, args } = await fixture()
  await expect(
    t.mutation(internal.approvals.execution.record, {
      ...args,
      result: success,
    })
  ).rejects.toThrow("not claimed")
  const otherRun = await t.run(
    async (ctx) => await ctx.db.insert("runs", runFields())
  )
  await t.mutation(internal.approvals.execution.claim, args)
  expect(
    await t.mutation(internal.approvals.execution.claim, {
      ...args,
      runId: otherRun,
    })
  ).toEqual({ state: "invalid" })
  await expect(
    t.mutation(internal.approvals.execution.record, {
      ...args,
      runId: otherRun,
      result: success,
    })
  ).rejects.toThrow("not claimed")
})

test("a policy blocked after approval is durably reported without executing", async () => {
  const { t, args, ctx, personId } = await fixture()
  await t.run(
    async (db) =>
      await db.db.insert("permissions", {
        organizationId: "verification",
        tool: "read_file",
        mode: "blocked",
        updatedBy: personId,
        updatedAt: Date.now(),
      })
  )
  const execute = vi.spyOn(jori, "callJoriTool")
  const result = await executeRunApproval(ctx, args)
  expect(result).toMatchObject({
    state: "done",
    result: expect.stringContaining("Tool is blocked: read_file"),
  })
  expect(execute).not.toHaveBeenCalled()
  expect(await executeRunApproval(ctx, args)).toEqual(result)
  const approval = await t.run(async (db) => await db.db.get(args.approvalId))
  expect(approval?.result).toBe(
    result.state === "done" ? result.result : "missing"
  )
  expect(approval?.consumedAt).toBeUndefined()
})

test("an execution exception is stored once and replay never calls the adapter", async () => {
  const { ctx, args } = await fixture()
  const execute = vi
    .spyOn(jori, "callJoriTool")
    .mockRejectedValue(
      new Error("Provider disconnected after accepting the request.")
    )
  const outcome = await executeRunApproval(ctx, args)
  expect(outcome).toMatchObject({
    state: "done",
    result: expect.stringContaining("Provider disconnected"),
  })
  expect(await executeRunApproval(ctx, args)).toEqual(outcome)
  expect(execute).toHaveBeenCalledTimes(1)
})

test.each([
  false,
  true,
])("concurrent execution preserves the canonical result (timeout: %s)", async (timeout) => {
  const { ctx, args } = await fixture()
  let release: (result: unknown) => void = () => undefined
  let started: () => void = () => undefined
  const entered = new Promise<void>((resolve) => {
    started = resolve
  })
  const execute = vi
    .spyOn(jori, "callJoriTool")
    .mockImplementation(async () => {
      started()
      return await new Promise((resolve) => {
        release = resolve
      })
    })
  const first = executeRunApproval(ctx, args)
  await entered
  expect(await executeRunApproval(ctx, args)).toEqual({
    state: "executing",
    expiresAt: Date.now() + approvalExecutionTimeoutMs,
  })
  if (timeout) {
    vi.setSystemTime(Date.now() + approvalExecutionTimeoutMs)
    const uncertain = await executeRunApproval(ctx, args)
    expect(uncertain).toMatchObject({
      state: "done",
      result: expect.stringContaining("could not be confirmed"),
    })
    release(JSON.parse(success))
    expect(await first).toEqual(uncertain)
    expect(execute).toHaveBeenCalledTimes(1)
    return
  }
  release(JSON.parse(success))
  expect(await first).toEqual({ state: "done", result: success })
  expect(execute).toHaveBeenCalledTimes(1)
})

test.each([
  false,
  true,
])("a result persistence failure cannot repeat the write (committed: %s)", async (committed) => {
  const { t, ctx, args } = await fixture()
  const execute = vi
    .spyOn(jori, "callJoriTool")
    .mockResolvedValue(JSON.parse(success))
  const write = ctx.runMutation
  ctx.runMutation = async (reference, input) => {
    if (getFunctionName(reference) === "approvals/execution:record") {
      if (committed) {
        await write(reference, input)
      }
      throw new Error("Lost persistence acknowledgement")
    }
    return await write(reference, input)
  }
  await expect(executeRunApproval(ctx, args)).rejects.toThrow(
    "Lost persistence acknowledgement"
  )
  ctx.runMutation = write
  const retry = await executeRunApproval(ctx, args)
  if (committed) {
    expect(retry).toEqual({ state: "done", result: success })
  } else {
    expect(retry.state).toBe("executing")
    vi.setSystemTime(Date.now() + approvalExecutionTimeoutMs)
    expect(await executeRunApproval(ctx, args)).toMatchObject({
      state: "done",
      result: expect.stringContaining("could not be confirmed"),
    })
  }
  expect(execute).toHaveBeenCalledTimes(1)
  expect(
    (await t.run(async (db) => await db.db.get(args.approvalId)))?.result
  ).toBeDefined()
})
