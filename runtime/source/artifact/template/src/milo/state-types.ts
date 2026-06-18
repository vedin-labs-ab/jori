import { type z } from "zod"
import { type JsonObject } from "./json"

export type MiloStateScope = "personal" | "shared"

export type MiloStateDocument<T = unknown> = {
  contractName: string
  key: string
  scope: MiloStateScope
  schemaHash: string
  schemaName: string
  schemaVersion: number
  value: T
  version: number
  updatedAt: number
}
export type RawMiloStateReadInput = {
  contractName: string
}

export type RawMiloStateListInput = {
  limit?: number
}

export type RawMiloStateUpdateInput = {
  contractName: string
  expectedVersion?: number
} & (
  | {
      value: unknown
      patch?: never
    }
  | {
      patch: unknown
      value?: never
    }
)

export type MiloStateSubscriptionInput = {
  intervalMs?: number
}

export type ArtifactStateDefinition<TSchema extends z.ZodType = z.ZodType> = {
  key: string
  schema: TSchema
  description?: string
  scope?: MiloStateScope
  schemaName?: string
  schemaVersion?: number
}
export type ArtifactStateContractJson = {
  name: string
  key: string
  scope: MiloStateScope
  description?: string
  schemaName: string
  schemaVersion: number
  schemaHash: string
  schema: JsonObject
}

export type ArtifactContractJson = {
  version: number
  state: ArtifactStateContractJson[]
}

export type ArtifactStateRef<TSchema extends z.ZodType = z.ZodType> = {
  name: string
  key: string
  scope: MiloStateScope
  description?: string
  schema: TSchema
  schemaName: string
  schemaVersion: number
  schemaHash: string
  toJSON: () => ArtifactStateContractJson
}

export type ArtifactContract<
  TState extends Record<string, ArtifactStateRef> = Record<
    string,
    ArtifactStateRef
  >,
> = {
  version: number
  state: TState
  toJSON: () => ArtifactContractJson
}

export type MiloStatePatch<T> = T extends unknown[]
  ? T | null
  : T extends object
    ? { [Key in keyof T]?: MiloStatePatch<T[Key]> | null }
    : T | null

export type MiloStateWriteOptions = {
  expectedVersion?: number
}

export type MiloStateReplaceInput<TSchema extends z.ZodType> = {
  expectedVersion?: number
  value: z.input<TSchema>
  patch?: never
}

export type MiloStatePatchInput<TSchema extends z.ZodType = z.ZodType> = {
  expectedVersion?: number
  patch: MiloStatePatch<z.input<TSchema>>
  value?: never
}

export type MiloStateClient = Readonly<{
  read: <TSchema extends z.ZodType>(
    ref: ArtifactStateRef<TSchema>
  ) => Promise<MiloStateDocument<z.output<TSchema>> | null>
  list: () => Promise<MiloStateDocument[]>
  replace: <TSchema extends z.ZodType>(
    ref: ArtifactStateRef<TSchema>,
    value: z.input<TSchema>,
    options?: MiloStateWriteOptions
  ) => Promise<MiloStateDocument<z.output<TSchema>>>
  patch: <TSchema extends z.ZodType>(
    ref: ArtifactStateRef<TSchema>,
    patch: MiloStatePatch<z.input<TSchema>>,
    options?: MiloStateWriteOptions
  ) => Promise<MiloStateDocument<z.output<TSchema>>>
  update: <TSchema extends z.ZodType>(
    ref: ArtifactStateRef<TSchema>,
    input: MiloStateReplaceInput<TSchema> | MiloStatePatchInput<TSchema>
  ) => Promise<MiloStateDocument<z.output<TSchema>>>
  subscribe: <TSchema extends z.ZodType>(
    ref: ArtifactStateRef<TSchema>,
    handler: (document: MiloStateDocument<z.output<TSchema>> | null) => void,
    input?: MiloStateSubscriptionInput
  ) => () => void
}>

export type MiloStateStatus = "loading" | "ready" | "saving" | "error"

export type MiloStateHookInput<T> = {
  defaultValue?: T
  intervalMs?: number
}

export type MiloStateHookResult<TSchema extends z.ZodType> = {
  document: MiloStateDocument<z.output<TSchema>> | null
  error: Error | null
  status: MiloStateStatus
  value: z.output<TSchema> | null
  patch: (
    patch: MiloStatePatch<z.input<TSchema>>,
    options?: MiloStateWriteOptions
  ) => Promise<MiloStateDocument<z.output<TSchema>>>
  refresh: () => Promise<MiloStateDocument<z.output<TSchema>> | null>
  replace: (
    value: z.input<TSchema>,
    options?: MiloStateWriteOptions
  ) => Promise<MiloStateDocument<z.output<TSchema>>>
}
