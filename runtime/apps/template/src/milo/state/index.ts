import { type z } from "zod"
import { parseStateValue } from "../contract"
import { type RawMiloClient } from "../types"
import {
  type AppStateRef,
  type MiloStateClient,
  type MiloStateDocument,
  type MiloStatePatch,
  type MiloStatePatchInput,
  type MiloStateReplaceInput,
  type MiloStateSubscriptionInput,
  type MiloStateWriteOptions,
} from "./types"

export function createStateClient(raw: RawMiloClient): MiloStateClient {
  return Object.freeze({
    read: (ref) => readState(raw, ref),
    list: async () => await raw.state.list(),
    replace: (ref, value, options) => replaceState(raw, ref, value, options),
    patch: (ref, patch, options) => patchState(raw, ref, patch, options),
    update: (ref, input) => updateState(raw, ref, input),
    subscribe: (ref, handler, input = {}) =>
      subscribeToState(raw, ref, handler, input),
  })
}

async function readState<TSchema extends z.ZodType>(
  raw: RawMiloClient,
  ref: AppStateRef<TSchema>
) {
  const document = await raw.state.read({ contractName: ref.name })

  return document === null ? null : parseStateDocument(ref, document)
}

async function replaceState<TSchema extends z.ZodType>(
  raw: RawMiloClient,
  ref: AppStateRef<TSchema>,
  value: z.input<TSchema>,
  options: MiloStateWriteOptions = {}
) {
  const document = await raw.state.update({
    contractName: ref.name,
    expectedVersion: options.expectedVersion,
    value: parseStateValue(ref, value),
  })

  return parseStateDocument(ref, document)
}

async function patchState<TSchema extends z.ZodType>(
  raw: RawMiloClient,
  ref: AppStateRef<TSchema>,
  patch: MiloStatePatch<z.input<TSchema>>,
  options: MiloStateWriteOptions = {}
) {
  const current = await raw.state.read({ contractName: ref.name })
  const value = parseStateValue(ref, mergePatch(current?.value ?? {}, patch))
  const document = await raw.state.update({
    contractName: ref.name,
    expectedVersion: options.expectedVersion ?? current?.version ?? 0,
    value,
  })

  return parseStateDocument(ref, document)
}

async function updateState<TSchema extends z.ZodType>(
  raw: RawMiloClient,
  ref: AppStateRef<TSchema>,
  input: MiloStateReplaceInput<TSchema> | MiloStatePatchInput<TSchema>
) {
  if (isReplaceInput(input)) {
    return await replaceState(raw, ref, input.value, {
      expectedVersion: input.expectedVersion,
    })
  }

  return await patchState(raw, ref, input.patch, {
    expectedVersion: input.expectedVersion,
  })
}

function isReplaceInput<TSchema extends z.ZodType>(
  input: MiloStateReplaceInput<TSchema> | MiloStatePatchInput<TSchema>
): input is MiloStateReplaceInput<TSchema> {
  return "value" in input
}

function parseStateDocument<TSchema extends z.ZodType>(
  ref: AppStateRef<TSchema>,
  document: MiloStateDocument
): MiloStateDocument<z.output<TSchema>> {
  if (document.schemaHash !== ref.schemaHash) {
    throw new Error(
      `App state ${ref.name} schema hash mismatch. Refresh the app contract.`
    )
  }

  return {
    ...document,
    value: parseStateValue(ref, document.value),
  }
}

function subscribeToState<TSchema extends z.ZodType>(
  raw: RawMiloClient,
  ref: AppStateRef<TSchema>,
  handler: (document: MiloStateDocument<z.output<TSchema>> | null) => void,
  input: MiloStateSubscriptionInput
) {
  let active = true
  let failed = false
  let initialized = false
  let polling = false
  let version: number | undefined
  const interval = Math.max(1000, input.intervalMs ?? 5000)
  const poll = async () => {
    if (polling) {
      return
    }

    polling = true
    try {
      const document = await readState(raw, ref)
      const nextVersion = document?.version

      if (active && (!initialized || failed || nextVersion !== version)) {
        handler(document)
      }

      initialized = true
      failed = false
      version = nextVersion
    } catch (error) {
      failed = true
      if (active) {
        input.onError?.(error)
      }
    } finally {
      polling = false
    }
  }
  const timer = window.setInterval(() => {
    void poll()
  }, interval)

  void poll()

  return () => {
    active = false
    window.clearInterval(timer)
  }
}

function mergePatch(target: unknown, patch: unknown): unknown {
  if (!isRecord(patch)) {
    return patch
  }

  const result = isRecord(target) ? { ...target } : {}

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key]
    } else {
      result[key] = mergePatch(result[key], value)
    }
  }

  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
