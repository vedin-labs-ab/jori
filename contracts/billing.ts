/**
 * Jori's commercial model in one place: org-wide plans, usage billed in
 * dollars at the model provider's public list rates, and a prepaid wallet.
 *
 * Every amount is an integer count of micro-dollars (1e-6 USD) so per-token
 * pricing stays exact integer math end to end.
 */

import { type ModelRate, modelRate } from "./models/catalog"

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

/** Why new work may not start: the state Jori is in, and what ends it.
 *  Every surface says both around its own consequence, so the composer's
 *  toast, the refused mutation, and the stopped run agree. */
export type BudgetReason = "trial-ended" | "paused" | "out-of-usage"

export const budgetBlocks: Record<
  BudgetReason,
  { clause: string; remedy: string }
> = {
  "trial-ended": {
    clause: "The trial has ended",
    remedy: "Choose a plan in Billing settings to keep Jori working.",
  },
  paused: {
    clause: "The subscription is paused",
    remedy: "Visit Billing settings to reactivate it.",
  },
  "out-of-usage": {
    clause: "Jori is out of usage",
    remedy:
      "Add to the wallet in Billing settings, or wait for the monthly reset.",
  },
}

/** "<clause>, so <consequence>. <remedy>" */
export function budgetSentence(reason: BudgetReason, consequence: string) {
  const block = budgetBlocks[reason]

  return `${block.clause}, so ${consequence}. ${block.remedy}`
}

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
 * Usage is priced at the provider's public list rates for the model that
 * answered, from the catalog in `models/`. Input covers every prompt
 * token, cached or not; the spread against cached actuals is the usage
 * margin. Output covers completion tokens, reasoning included. Rates can
 * be fractions of a micro-dollar, so the amount rounds to whole micros.
 */
export function priceTokens(
  rate: ModelRate,
  tokens: { input: number; output: number }
) {
  return Math.round(
    tokens.input * rate.inputMicrosPerToken +
      tokens.output * rate.outputMicrosPerToken
  )
}

/** The catalog's rate for the model; a model outside the catalog throws
 *  rather than bill at a guess. */
export function priceModelTokens(
  model: string,
  tokens: { input: number; output: number }
) {
  return priceTokens(modelRate(model), tokens)
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
