import { useCallback, useEffect, useMemo, useState } from "react"
import { type z } from "zod"
import { createStateClient } from "./state"
import {
  type ArtifactStateRef,
  type MiloStateClient,
  type MiloStateDocument,
  type MiloStateHookInput,
  type MiloStateHookResult,
  type MiloStatePatch,
  type MiloStateStatus,
  type MiloStateWriteOptions,
  type RawMiloClient,
} from "./types"

export function useMiloState<TSchema extends z.ZodType>(
  ref: ArtifactStateRef<TSchema>,
  input: MiloStateHookInput<z.output<TSchema>> = {}
): MiloStateHookResult<TSchema> {
  const client = useMemo(() => createStateClient(readRawMiloClient()), [])
  const [document, setDocument] = useState<MiloStateDocument<
    z.output<TSchema>
  > | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<MiloStateStatus>("loading")
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
  client: MiloStateClient,
  ref: ArtifactStateRef<TSchema>,
  setDocument: (document: MiloStateDocument<z.output<TSchema>> | null) => void,
  setError: (error: Error | null) => void,
  setStatus: (status: MiloStateStatus) => void
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
  client: MiloStateClient,
  ref: ArtifactStateRef<TSchema>,
  setDocument: (document: MiloStateDocument<z.output<TSchema>>) => void,
  setError: (error: Error | null) => void,
  setStatus: (status: MiloStateStatus) => void
) {
  return useCallback(
    async (value: z.input<TSchema>, options?: MiloStateWriteOptions) =>
      await runStateOperation("saving", setError, setStatus, async () => {
        const document = await client.replace(ref, value, options)
        setDocument(document)
        return document
      }),
    [client, ref, setDocument, setError, setStatus]
  )
}

function usePatchState<TSchema extends z.ZodType>(
  client: MiloStateClient,
  ref: ArtifactStateRef<TSchema>,
  setDocument: (document: MiloStateDocument<z.output<TSchema>>) => void,
  setError: (error: Error | null) => void,
  setStatus: (status: MiloStateStatus) => void
) {
  return useCallback(
    async (
      patch: MiloStatePatch<z.input<TSchema>>,
      options?: MiloStateWriteOptions
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
  client: MiloStateClient,
  ref: ArtifactStateRef<TSchema>,
  intervalMs: number | undefined,
  setDocument: (document: MiloStateDocument<z.output<TSchema>> | null) => void,
  setError: (error: Error | null) => void,
  setStatus: (status: MiloStateStatus) => void
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
  loadingStatus: MiloStateStatus,
  setError: (error: Error | null) => void,
  setStatus: (status: MiloStateStatus) => void,
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

function readRawMiloClient() {
  const raw = (window as Window & { Milo?: RawMiloClient }).Milo

  if (raw === undefined) {
    throw new Error("Milo artifact SDK is not ready.")
  }

  return raw
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error("Artifact state failed.")
}
