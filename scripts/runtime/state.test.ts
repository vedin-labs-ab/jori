// @vitest-environment jsdom

import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { z } from "zod"
import { defineArtifactContract } from "../../runtime/source/artifact/template/src/milo/contract"
import { createStateClient } from "../../runtime/source/artifact/template/src/milo/state"
import {
  type MiloStateDocument,
  type RawMiloClient,
} from "../../runtime/source/artifact/template/src/milo/types"

const ref = defineArtifactContract({
  state: {
    sample: {
      key: "sample",
      schema: z.strictObject({ message: z.string() }),
    },
  },
}).state.sample

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test("state subscriptions emit an initially absent document", async () => {
  const read = vi.fn(async () => null)
  const handler = vi.fn()
  const stop = createStateClient(rawClient(read)).subscribe(ref, handler)

  await vi.advanceTimersByTimeAsync(0)

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith(null)
  stop()
})

test("poll errors surface and an unchanged document re-emits on recovery", async () => {
  const document = stateDocument()
  const read = vi
    .fn<() => Promise<MiloStateDocument | null>>()
    .mockResolvedValueOnce(document)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(document)
  const handler = vi.fn()
  const onError = vi.fn()
  const stop = createStateClient(rawClient(read)).subscribe(ref, handler, {
    intervalMs: 1000,
    onError,
  })

  await vi.advanceTimersByTimeAsync(0)
  await vi.advanceTimersByTimeAsync(1000)
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ message: "offline" })
  )

  await vi.advanceTimersByTimeAsync(1000)
  expect(handler).toHaveBeenCalledTimes(2)
  expect(handler).toHaveBeenLastCalledWith(document)
  stop()
})

test("state subscriptions do not overlap polls", async () => {
  const first = deferred<MiloStateDocument | null>()
  const second = { ...stateDocument(), version: 2 }
  const read = vi
    .fn<() => Promise<MiloStateDocument | null>>()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue(second)
  const handler = vi.fn()
  const stop = createStateClient(rawClient(read)).subscribe(ref, handler, {
    intervalMs: 1000,
  })

  await vi.advanceTimersByTimeAsync(1000)
  expect(read).toHaveBeenCalledOnce()

  first.resolve(stateDocument())
  await vi.advanceTimersByTimeAsync(0)
  await vi.advanceTimersByTimeAsync(1000)

  expect(handler.mock.calls.map(([document]) => document?.version)).toEqual([
    1, 2,
  ])
  stop()
})

function rawClient(
  read: (input: { contractName: string }) => Promise<MiloStateDocument | null>
) {
  return {
    state: {
      read,
      list: async () => [],
      update: async () => stateDocument(),
    },
  } as unknown as RawMiloClient
}

function stateDocument(): MiloStateDocument {
  return {
    contractName: "sample",
    key: "sample",
    scope: "personal",
    schemaHash: ref.schemaHash,
    schemaName: "sample",
    schemaVersion: 1,
    value: { message: "ready" },
    version: 1,
    updatedAt: 1,
  }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((done) => {
    resolve = done
  })

  return { promise, resolve }
}
