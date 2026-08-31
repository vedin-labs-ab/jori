/**
 * Jori's commercial model in one place: org-wide plans, usage billed in
 * dollars at the model provider's public list rates, and a prepaid wallet.
 *
 * Every amount is an integer count of micro-dollars (1e-6 USD) so per-token
 * pricing stays exact integer math end to end.
 */

export const microsPerDollar = 1_000_000

export const plans = {
  starter: {
    key: "starter",
    label: "Starter",
    monthlyPriceUsd: 34,
    annualPriceUsd: 324,
    monthlyAllowanceMicros: 15 * microsPerDollar,
    memberLimit: 10,
  },
  team: {
    key: "team",
    label: "Team",
    monthlyPriceUsd: 124,
    annualPriceUsd: 1188,
    monthlyAllowanceMicros: 75 * microsPerDollar,
    memberLimit: 50,
  },
} as const

export type PlanKey = keyof typeof plans

export const planKeys = Object.keys(plans) as PlanKey[]

export const billingIntervals = ["month", "year"] as const

export type BillingInterval = (typeof billingIntervals)[number]

export const trial = {
  days: 14,
  allowanceMicros: 25 * microsPerDollar,
}

/**
 * Interactive work (console instructions, mentions) may dip slightly below a
 * zero balance so Jori never goes silent mid-conversation. Scheduled work
 * stops at zero.
 */
export const interactiveGraceMicros = 2 * microsPerDollar

export const topUp = {
  presetsUsd: [25, 50, 100, 200],
  defaultUsd: 50,
  minimumUsd: 10,
  maximumUsd: 1000,
}

/**
 * Auto top-up is the spend control: it fires when the balance drops below the
 * chosen threshold and never adds more than the monthly cap in one billing
 * month. One attempt owns the claim window; a decline cools down before
 * retrying.
 */
export const autoTopUp = {
  thresholdsUsd: [10, 50, 100],
  defaultThresholdUsd: 10,
  amountsUsd: [25, 50, 100, 200],
  defaultAmountUsd: 25,
  monthlyCapsUsd: [100, 200, 500, 1000],
  defaultCapUsd: 200,
  claimMs: 60 * 60 * 1000,
  cooldownMs: 6 * 60 * 60 * 1000,
}

/**
 * The model Jori runs on. One choice, stated once, for every call Jori makes:
 * the agent, the deduction judge, conversation summaries, place profiles,
 * and organization discovery.
 *
 * Model selection is deliberately not deployment configuration. It decides
 * what Jori costs and how its output behaves, so it belongs in code and in
 * review, and it lives here because the rate table below has to be keyed by
 * it: a model Jori can call but cannot price is not a thing that should exist.
 */
export const joriModel = "openai/gpt-5.6-sol"

type ModelRate = {
  inputMicrosPerToken: number
  outputMicrosPerToken: number
}

/**
 * Provider list rates. Input covers every prompt token, cached or not; the
 * spread against cached actuals is the usage margin. Output covers completion
 * tokens, reasoning included.
 */
export const modelRates: Record<string, ModelRate> = {
  [joriModel]: { inputMicrosPerToken: 5, outputMicrosPerToken: 30 },
}

/** A model missing from the rate table bills at the highest configured rate
 *  so a routing change can never silently undercharge. */
export function resolveModelRate(model: string): ModelRate {
  const known = modelRates[model]

  if (known !== undefined) {
    return known
  }

  return Object.values(modelRates).reduce((left, right) =>
    left.inputMicrosPerToken + left.outputMicrosPerToken >=
    right.inputMicrosPerToken + right.outputMicrosPerToken
      ? left
      : right
  )
}

export function priceModelUsage(
  model: string,
  usage: { inputTokens: number; outputTokens: number }
) {
  const rate = resolveModelRate(model)

  return (
    usage.inputTokens * rate.inputMicrosPerToken +
    usage.outputTokens * rate.outputMicrosPerToken
  )
}

export function dollarsToMicros(usd: number) {
  return Math.round(usd * microsPerDollar)
}

export function microsToDollars(micros: number) {
  return micros / microsPerDollar
}

export function formatUsd(micros: number): string {
  const sign = micros < 0 ? "-" : ""
  const magnitude = Math.abs(micros)

  if (magnitude > 0 && magnitude < microsPerDollar / 100) {
    return `${sign}<$0.01`
  }

  const cents = Math.round(magnitude / (microsPerDollar / 100))

  return `${sign}$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
