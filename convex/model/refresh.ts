import { OpenRouterCore } from "@openrouter/sdk/core"
import { modelsGet } from "@openrouter/sdk/funcs/modelsGet"
import { type Model } from "@openrouter/sdk/models"
import { v } from "convex/values"
import { joriModel } from "../../contracts/billing"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { requireOpenRouterConfig } from "./openrouter"

type FetchedWindow = {
  contextLength: number
  model: string
  maxCompletionTokens?: number
}

/** The model's window as OpenRouter lists it today, written for the loop
 *  and the console to read. The cron runs it daily. */
export const run = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(
      internal.model.window.upsert,
      await fetchModelWindow(joriModel)
    )

    return null
  },
})

/** One standalone SDK call: the core client with the models-get function
 *  alone, never the root client, which evaluates every schema on import. */
async function fetchModelWindow(model: string): Promise<FetchedWindow> {
  const separator = model.indexOf("/")
  const result = await modelsGet(
    new OpenRouterCore(requireOpenRouterConfig()),
    {
      author: model.slice(0, separator),
      slug: model.slice(separator + 1),
    }
  )

  if (!result.ok) {
    throw result.error
  }

  return readModelWindow(model, result.value.data)
}

/**
 * The listing names the model's own window and the window of the provider
 * it routes to; a prompt has to fit the smaller. The completion cap comes
 * only from the provider, since that is who enforces it.
 */
export function readModelWindow(
  model: string,
  data: Pick<Model, "contextLength" | "topProvider">
): FetchedWindow {
  const lengths = [data.contextLength, data.topProvider.contextLength].filter(
    (length): length is number => typeof length === "number"
  )

  if (lengths.length === 0) {
    throw new Error(`OpenRouter lists no context length for ${model}.`)
  }

  const maxCompletionTokens = data.topProvider.maxCompletionTokens

  return {
    contextLength: Math.min(...lengths),
    model,
    ...(typeof maxCompletionTokens === "number" ? { maxCompletionTokens } : {}),
  }
}
