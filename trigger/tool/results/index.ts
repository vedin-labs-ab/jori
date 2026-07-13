import { type JsonObject } from "../../../contracts/json"

export { materializeSandboxResult } from "./materialize"

export function toolResult(value: unknown, finished = false) {
  return { finished, value }
}

export function toolErrorResult(message: string): JsonObject {
  return {
    error: {
      message,
    },
    status: "error",
  }
}
