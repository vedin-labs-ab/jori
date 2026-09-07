/**
 * The models Jori can run on: OpenAI's and Anthropic's current generation,
 * as OpenRouter lists them. Slugs, windows, and list rates are copied from
 * the public listing (https://openrouter.ai/api/v1/models) and refreshed
 * daily into the `models` table; the constants here are what every reader
 * falls back to until that first refresh lands, and what the console
 * prices with, since it has no table to read.
 *
 * A model Jori can call but cannot price is not a thing that should exist,
 * so pricing is keyed by this catalog and an unknown slug throws.
 */

export const modelVendors = {
  anthropic: "Anthropic",
  openai: "OpenAI",
} as const

export type ModelVendor = keyof typeof modelVendors

/** Micro-dollars per token, as fractions where the list rate is under a
 *  micro-dollar; a priced amount rounds to whole micro-dollars. */
export type ModelRate = {
  inputMicrosPerToken: number
  outputMicrosPerToken: number
}

export type CatalogModel = {
  slug: string
  label: string
  vendor: ModelVendor
  /** Whether the listing says the model takes a reasoning effort. */
  reasoning: boolean
  contextLength: number
  maxCompletionTokens?: number
  rate: ModelRate
}

export const models = [
  {
    slug: "openai/gpt-6-astra",
    label: "GPT-6 Astra",
    vendor: "openai",
    reasoning: true,
    contextLength: 1_050_000,
    maxCompletionTokens: 128_000,
    rate: { inputMicrosPerToken: 10, outputMicrosPerToken: 50 },
  },
  {
    slug: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    vendor: "openai",
    reasoning: true,
    contextLength: 1_050_000,
    maxCompletionTokens: 128_000,
    rate: { inputMicrosPerToken: 2, outputMicrosPerToken: 10 },
  },
  {
    slug: "openai/gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    vendor: "openai",
    reasoning: true,
    contextLength: 1_050_000,
    maxCompletionTokens: 128_000,
    rate: { inputMicrosPerToken: 2, outputMicrosPerToken: 12 },
  },
  {
    slug: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    vendor: "openai",
    reasoning: true,
    contextLength: 1_050_000,
    maxCompletionTokens: 128_000,
    rate: { inputMicrosPerToken: 0.2, outputMicrosPerToken: 1.2 },
  },
  {
    slug: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    vendor: "openai",
    reasoning: true,
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    rate: { inputMicrosPerToken: 0.75, outputMicrosPerToken: 4.5 },
  },
  {
    slug: "openai/gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    vendor: "openai",
    reasoning: true,
    contextLength: 400_000,
    maxCompletionTokens: 128_000,
    rate: { inputMicrosPerToken: 0.2, outputMicrosPerToken: 1.25 },
  },
  {
    slug: "anthropic/claude-opus-5",
    label: "Claude Opus 5",
    vendor: "anthropic",
    reasoning: true,
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    rate: { inputMicrosPerToken: 5, outputMicrosPerToken: 25 },
  },
  {
    slug: "anthropic/claude-sonnet-5",
    label: "Claude Sonnet 5",
    vendor: "anthropic",
    reasoning: true,
    contextLength: 1_000_000,
    maxCompletionTokens: 128_000,
    rate: { inputMicrosPerToken: 2, outputMicrosPerToken: 10 },
  },
  {
    slug: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    vendor: "anthropic",
    reasoning: true,
    contextLength: 200_000,
    maxCompletionTokens: 64_000,
    rate: { inputMicrosPerToken: 1, outputMicrosPerToken: 5 },
  },
] as const satisfies readonly CatalogModel[]

export type ModelSlug = (typeof models)[number]["slug"]

export const modelSlugs = models.map((model) => model.slug) as ModelSlug[]

export function isModelSlug(value: unknown): value is ModelSlug {
  return modelSlugs.some((slug) => slug === value)
}

/** The catalog's entry for a slug; a slug outside the catalog throws,
 *  since nothing downstream can window or price it. */
export function catalogModel(slug: string): CatalogModel {
  const model = models.find((candidate) => candidate.slug === slug)

  if (model === undefined) {
    throw new Error(`${slug} is not a model Jori can run on.`)
  }

  return model
}

export function modelLabel(slug: string) {
  return catalogModel(slug).label
}

export function modelRate(slug: string): ModelRate {
  return catalogModel(slug).rate
}

/** The models of one vendor, in the catalog's order. */
export function vendorModels(vendor: ModelVendor) {
  return models.filter((model) => model.vendor === vendor)
}
