import { useCallback, useEffect, useMemo, useState } from "react"
import { type z } from "zod"
import { createStateClient } from "./state"
import {
  type AppStateRef,
  type JoriStateClient,
  type JoriStateDocument,
  type JoriStateHookInput,
  type JoriStateHookResult,
  type JoriStatePatch,
  type JoriStateStatus,
  type JoriStateWriteOptions,
  type RawJoriClient,
} from "./types"

export function useJoriState<TSchema extends z.ZodType>(
  ref: AppStateRef<TSchema>,
  input: JoriStateHookInput<z.output<TSchema>> = {}
): JoriStateHookResult<TSchema> {
  const client = useMemo(() => createStateClient(readRawJoriClient()), [])
  const [document, setDocument] = useState<JoriStateDocument<
    z.output<TSchema>
  > | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<JoriStateStatus>("loading")
  const refresh = useRefreshState(client, ref, setDocument, setError, setStatus)
  const replace = useReplaceState(client, ref, setDocument, setError, setStatus)
  const patch = usePatchState(client, ref, setDocument, setError, setStatus)

  useSubscribedState(
    client,
    ref,
    input.intervalMs,
    setDocument,
    setError,
    setStatus
  )

  return {
    document,
    error,
    patch,
    refresh,
    replace,
    status,
    value: document?.value ?? input.defaultValue ?? null,
  }
}

function useRefreshState<TSchema extends z.ZodType>(
  client: JoriStateClient,
  ref: AppStateRef<TSchema>,
  setDocument: (document: JoriStateDocument<z.output<TSchema>> | null) => void,
  setError: (error: Error | null) => void,
  setStatus: (status: JoriStateStatus) => void
) {
  return useCallback(async () => {
    return await runStateOperation("loading", setError, setStatus, async () => {
      const document = await client.read(ref)
      setDocument(document)
      return document
    })
  }, [client, ref, setDocument, setError, setStatus])
}

function useReplaceState<TSchema extends z.ZodType>(
  client: JoriStateClient,
  ref: AppStateRef<TSchema>,
  setDocument: (document: JoriStateDocument<z.output<TSchema>>) => void,
  setError: (error: Error | null) => void,
  setStatus: (status: JoriStateStatus) => void
) {
  return useCallback(
    async (value: z.input<TSchema>, options?: JoriStateWriteOptions) =>
      await runStateOperation("saving", setError, setStatus, async () => {
        const document = await client.replace(ref, value, options)
        setDocument(document)
        return document
      }),
    [client, ref, setDocument, setError, setStatus]
  )
}

function usePatchState<TSchema extends z.ZodType>(
  client: JoriStateClient,
  ref: AppStateRef<TSchema>,
  setDocument: (document: JoriStateDocument<z.output<TSchema>>) => void,
  setError: (error: Error | null) => void,
  setStatus: (status: JoriStateStatus) => void
) {
  return useCallback(
    async (
      patch: JoriStatePatch<z.input<TSchema>>,
      options?: JoriStateWriteOptions
    ) =>
      await runStateOperation("saving", setError, setStatus, async () => {
        const document = await client.patch(ref, patch, options)
        setDocument(document)
        return document
      }),
    [client, ref, setDocument, setError, setStatus]
  )
}

function useSubscribedState<TSchema extends z.ZodType>(
  client: JoriStateClient,
  ref: AppStateRef<TSchema>,
  intervalMs: number | undefined,
  setDocument: (document: JoriStateDocument<z.output<TSchema>> | null) => void,
  setError: (error: Error | null) => void,
  setStatus: (status: JoriStateStatus) => void
) {
  useEffect(() => {
    setStatus("loading")

    return client.subscribe(
      ref,
      (document) => {
        setDocument(document)
        setError(null)
        setStatus("ready")
      },
      {
        intervalMs,
        onError: (subscriptionError) => {
          setError(asError(subscriptionError))
          setStatus("error")
        },
      }
    )
  }, [client, ref, intervalMs, setDocument, setError, setStatus])
}

async function runStateOperation<T>(
  loadingStatus: JoriStateStatus,
  setError: (error: Error | null) => void,
  setStatus: (status: JoriStateStatus) => void,
  run: () => Promise<T>
) {
  setStatus(loadingStatus)
  setError(null)

  try {
    const value = await run()
    setStatus("ready")
    return value
  } catch (error) {
    setStatus("error")
    setError(asError(error))
    throw error
  }
}

function readRawJoriClient() {
  const raw = (window as Window & { Jori?: RawJoriClient }).Jori

  if (raw === undefined) {
    throw new Error("Jori app SDK is not ready.")
  }

  return raw
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error("App state failed.")
}
