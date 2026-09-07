import { type Model, type PublicPricing } from "@openrouter/sdk/models"
import { v } from "convex/values"
import { microsPerDollar } from "../../contracts/billing"
import { isModelSlug, type ModelRate } from "../../contracts/models/catalog"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { eligibleModels } from "./eligibility"

type FetchedListing = {
  contextLength: number
  model: string
  maxCompletionTokens?: number
  rate: ModelRate
}

/** Every catalog model's window and rate as OpenRouter lists them today,
 *  written for the loop, the meter, and the console to read. The cron
 *  runs it daily; one model's failure leaves the others refreshed. */
export const run = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const models = (await eligibleModels()).filter((model) =>
      isModelSlug(model.id)
    )
    const failures: string[] = []

    for (const model of models) {
      try {
        await ctx.runMutation(
          internal.model.window.upsert,
          readModelListing(model.id, model)
        )
      } catch (error) {
        failures.push(model.id)
        console.error("Model refresh failed.", { model: model.id, error })
      }
    }

    if (failures.length > 0) {
      throw new Error(`Model refresh failed for ${failures.join(", ")}.`)
    }

    return null
  },
})

/**
 * The listing names the model's own window and the window of the provider
 * it routes to; a prompt has to fit the smaller. The completion cap comes
 * only from the provider, since that is who enforces it. Prices are USD
 * per token as decimal strings, kept here as micro-dollars per token.
 */
export function readModelListing(
  model: string,
  data: Pick<Model, "contextLength" | "topProvider"> & {
    pricing: Pick<PublicPricing, "completion" | "prompt">
  }
): FetchedListing {
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
    rate: {
      inputMicrosPerToken: readMicros(model, data.pricing.prompt),
      outputMicrosPerToken: readMicros(model, data.pricing.completion),
    },
  }
}

function readMicros(model: string, usdPerToken: string) {
  const micros = Number(usdPerToken) * microsPerDollar

  if (!Number.isFinite(micros) || micros < 0) {
    throw new Error(`OpenRouter lists no usable price for ${model}.`)
  }

  return micros
}
