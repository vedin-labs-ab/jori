import { compactRecord } from "../../../contracts/json"
import { optionalNumber, optionalString } from "../../shared/input"
import { type RunToolSnapshot } from "../agent/tools/snapshot"
import { type ModelUsage, type ToolResult } from "../execution/traces/schema"
import { type ToolLabel } from "./types"

// Trace shapes are validated by the database. These readers only normalize
// display values: blank text is absent and nonfinite numbers are omitted.
export function readPreparedTools(snapshot: RunToolSnapshot): ToolLabel[] {
  return snapshot.groups.flatMap((group) =>
    group.tools.flatMap((value) => {
      const tool = optionalString(value.tool)
      const label = optionalString(value.label)

      return tool === undefined || label === undefined
        ? []
        : [
            {
              access: value.access,
              description: optionalString(value.description),
              label,
              tool,
            },
          ]
    })
  )
}

export function readModelUsage(usage: ModelUsage): ModelUsage {
  return {
    durationMs: optionalNumber(usage.durationMs) ?? 0,
    tokens: {
      cacheRead: optionalNumber(usage.tokens.cacheRead) ?? 0,
      cacheWrite: optionalNumber(usage.tokens.cacheWrite) ?? 0,
      input: optionalNumber(usage.tokens.input) ?? 0,
      output: optionalNumber(usage.tokens.output) ?? 0,
      reasoning: optionalNumber(usage.tokens.reasoning) ?? 0,
      total: optionalNumber(usage.tokens.total) ?? 0,
      uncached: optionalNumber(usage.tokens.uncached) ?? 0,
    },
    toolCalls: optionalNumber(usage.toolCalls) ?? 0,
  }
}

export function readToolResult(result: ToolResult): ToolResult | undefined {
  switch (result.kind) {
    case "boolean":
    case "null":
      return { kind: result.kind }
    case "array":
    case "object": {
      const size = optionalNumber(result.size)

      if (size === undefined) {
        return undefined
      }

      return result.kind === "array"
        ? { kind: result.kind, size }
        : compactRecord({
            kind: result.kind,
            size,
            itemCount: optionalNumber(result.itemCount),
            itemKey: optionalString(result.itemKey),
            hasMore: result.hasMore,
          })
    }
    case "number":
    case "string": {
      const preview = optionalString(result.preview)

      if (preview === undefined) {
        return undefined
      }

      if (result.kind === "number") {
        return { kind: result.kind, preview }
      }

      const length = optionalNumber(result.length)

      return length === undefined
        ? undefined
        : { kind: result.kind, preview, length }
    }
  }
}
