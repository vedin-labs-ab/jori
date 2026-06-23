import { BasetenModelRuntime } from "./baseten"
import { requireAgentModelProvider } from "./config"
import { OpenRouterModelRuntime } from "./openrouter"
import { type ModelRuntime } from "./types"

export function createModelRuntime(): ModelRuntime {
  switch (requireAgentModelProvider()) {
    case "baseten":
      return new BasetenModelRuntime()
    case "openrouter":
      return new OpenRouterModelRuntime()
  }
}
