import { OpenRouterModelRuntime } from "./openrouter"
import { type ModelRuntime } from "./types"

export function createModelRuntime(): ModelRuntime {
  return new OpenRouterModelRuntime()
}
