import { type FunctionReference } from "convex/server"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"

export type ProviderCallbackStatus = "connected" | "error"

const callbackStateMaxAgeMs = 10 * 60 * 1000

export function redirectWithStatus(
  returnUrl: string,
  param: string,
  status: ProviderCallbackStatus
) {
  const url = new URL(returnUrl)
  url.searchParams.set(param, status)

  return Response.redirect(url.toString(), 302)
}

export function unauthorizedResponse() {
  return new Response("Unauthorized", { status: 401 })
}

export async function readCallbackState<
  State extends { createdAt: number },
>(args: {
  value: string
  parse: (value: string) => Promise<State>
  label: string
}): Promise<{ ok: true; state: State } | { ok: false; response: Response }> {
  let state: State

  try {
    state = await args.parse(args.value)
  } catch {
    return {
      ok: false,
      response: new Response(`Invalid ${args.label} state`, { status: 400 }),
    }
  }

  if (Date.now() - state.createdAt > callbackStateMaxAgeMs) {
    return {
      ok: false,
      response: new Response(`Expired ${args.label} state`, { status: 400 }),
    }
  }

  return { ok: true, state }
}

type ObservedMessage = {
  accountId: string
  type: string
  externalId: string
  actor?: Actor
  conversationId?: string
  text?: string
  observedAt?: number
  data?: unknown
}

type IngestMessageResult =
  | { status: "started"; runId: Id<"runs"> }
  | { status: "continued"; sessionId: Id<"sessions"> }
  | { status: "missing_integration" | "ignored_bot" | "duplicate" }
  | { status: "ignored" | "ignored_empty"; messageId: Id<"messages"> }

export async function ingestProviderMessage(
  ctx: ActionCtx,
  record: FunctionReference<
    "mutation",
    "internal",
    ObservedMessage,
    IngestMessageResult
  >,
  message: ObservedMessage
) {
  await ctx.runMutation(record, message)

  return Response.json({ ok: true })
}
