import { type Model } from "@openrouter/sdk/models"
import { modelsListResponseFromJSON } from "@openrouter/sdk/models/modelslistresponse"
import { requireOpenRouterConfig } from "./connection"

const lifetimeMs = 60_000
let cached:
  | { key: string; expiresAt: number; result: Promise<Model[]> }
  | undefined

/** One source for the picker, refresh and inference guard. The authenticated
 * regional catalog applies the workspace's provider/privacy guardrails.
 * Nothing from a prompt is sent during this lookup. Failed lookups are never
 * replaced by a global catalog or by a stale successful result. */
export function eligibleModels() {
  const config = requireOpenRouterConfig()
  const key = `${config.serverURL}:${config.apiKey}`
  if (cached?.key === key && cached.expiresAt > Date.now()) {
    return cached.result
  }
  const result = readCatalog(config).catch(() => {
    if (cached?.result === result) {
      cached = undefined
    }
    throw new Error(
      "Cannot verify models available in this region. Try again shortly."
    )
  })
  cached = { key, expiresAt: Date.now() + lifetimeMs, result }
  return result
}

async function readCatalog(config: ReturnType<typeof requireOpenRouterConfig>) {
  // The SDK does not yet expose output_modalities on models/user. Keep its
  // response validation, with a bounded native request for every modality.
  const response = await fetch(
    `${config.serverURL}/models/user?limit=1000&output_modalities=all`,
    {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    }
  )
  if (!response.ok) {
    throw new Error("Regional model catalog request failed")
  }
  const result = modelsListResponseFromJSON(await response.text())
  if (!result.ok || result.value.data.length === 1000) {
    throw new Error("Regional model catalog could not be read completely")
  }
  return result.value.data
}

/** A missing choice is an error before customer data leaves Convex. All
 * candidate models must be eligible, including explicitly supplied fallbacks. */
export async function requireEligibleModels(models: readonly string[]) {
  const available = new Map(
    (await eligibleModels()).map((model) => [model.id, model])
  )
  const selected = models.map((model) => available.get(model))
  if (selected.length === 0 || selected.some((model) => model === undefined)) {
    throw new Error(
      "The selected model is unavailable in this region. Choose another model."
    )
  }
  return selected.filter((model): model is Model => model !== undefined)
}
