import { encodeToolResult } from "../../contracts/transport"
import { type JsonObject } from "../types"

export function toolResult(value: unknown, finished = false) {
  return { finished, value }
}

export function toToolContent(result: unknown) {
  return encodeToolResult(result)
}

export function toolErrorResult(message: string): JsonObject {
  return {
    error: {
      message,
    },
    status: "error",
  }
}
