import { type z } from "zod"
import { type JsonObject } from "../json"

export type JoriStateScope = "personal" | "shared"

export type JoriStateDocument<T = unknown> = {
  contractName: string
  key: string
  scope: JoriStateScope
  schemaHash: string
  schemaName: string
  schemaVersion: number
  value: T
  version: number
  updatedAt: number
}
export type RawJoriStateReadInput = {
  contractName: string
}

export type RawJoriStateListInput = {
  limit?: number
}

export type RawJoriStateUpdateInput = {
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

export type JoriStateSubscriptionInput = {
  intervalMs?: number
  onError?: (error: unknown) => void
}

export type AppStateDefinition<TSchema extends z.ZodType = z.ZodType> = {
  key: string
  schema: TSchema
  /** Shown to people in the console. */
  description?: string
  /** Guidance rendered into the agent's run context. */
  usage?: string
  scope?: JoriStateScope
  schemaName?: string
  schemaVersion?: number
}
export type AppStateContractJson = {
  name: string
  key: string
  scope: JoriStateScope
  description?: string
  usage?: string
  schemaName: string
  schemaVersion: number
  schemaHash: string
  schema: JsonObject
}

export type AppContractJson = {
  version: number
  state: AppStateContractJson[]
}

export type AppStateRef<TSchema extends z.ZodType = z.ZodType> = {
  name: string
  key: string
  scope: JoriStateScope
  description?: string
  usage?: string
  schema: TSchema
  schemaName: string
  schemaVersion: number
  schemaHash: string
  toJSON: () => AppStateContractJson
}

export type AppContract<
  TState extends Record<string, AppStateRef> = Record<string, AppStateRef>,
> = {
  version: number
  state: TState
  toJSON: () => AppContractJson
}

export type JoriStatePatch<T> = T extends unknown[]
  ? T | null
  : T extends object
    ? { [Key in keyof T]?: JoriStatePatch<T[Key]> | null }
    : T | null

export type JoriStateWriteOptions = {
  expectedVersion?: number
}

export type JoriStateReplaceInput<TSchema extends z.ZodType> = {
  expectedVersion?: number
  value: z.input<TSchema>
  patch?: never
}

export type JoriStatePatchInput<TSchema extends z.ZodType = z.ZodType> = {
  expectedVersion?: number
  patch: JoriStatePatch<z.input<TSchema>>
  value?: never
}

export type JoriStateClient = Readonly<{
  read: <TSchema extends z.ZodType>(
    ref: AppStateRef<TSchema>
  ) => Promise<JoriStateDocument<z.output<TSchema>> | null>
  list: () => Promise<JoriStateDocument[]>
  replace: <TSchema extends z.ZodType>(
    ref: AppStateRef<TSchema>,
    value: z.input<TSchema>,
    options?: JoriStateWriteOptions
  ) => Promise<JoriStateDocument<z.output<TSchema>>>
  patch: <TSchema extends z.ZodType>(
    ref: AppStateRef<TSchema>,
    patch: JoriStatePatch<z.input<TSchema>>,
    options?: JoriStateWriteOptions
  ) => Promise<JoriStateDocument<z.output<TSchema>>>
  update: <TSchema extends z.ZodType>(
    ref: AppStateRef<TSchema>,
    input: JoriStateReplaceInput<TSchema> | JoriStatePatchInput<TSchema>
  ) => Promise<JoriStateDocument<z.output<TSchema>>>
  subscribe: <TSchema extends z.ZodType>(
    ref: AppStateRef<TSchema>,
    handler: (document: JoriStateDocument<z.output<TSchema>> | null) => void,
    input?: JoriStateSubscriptionInput
  ) => () => void
}>

export type JoriStateStatus = "loading" | "ready" | "saving" | "error"

export type JoriStateHookInput<T> = {
  defaultValue?: T
  intervalMs?: number
}

export type JoriStateHookResult<TSchema extends z.ZodType> = {
  document: JoriStateDocument<z.output<TSchema>> | null
  error: Error | null
  status: JoriStateStatus
  value: z.output<TSchema> | null
  patch: (
    patch: JoriStatePatch<z.input<TSchema>>,
    options?: JoriStateWriteOptions
  ) => Promise<JoriStateDocument<z.output<TSchema>>>
  refresh: () => Promise<JoriStateDocument<z.output<TSchema>> | null>
  replace: (
    value: z.input<TSchema>,
    options?: JoriStateWriteOptions
  ) => Promise<JoriStateDocument<z.output<TSchema>>>
}
