import { v } from "convex/values"
import { linearIssueCommentEvent } from "../../../../contracts/jobs/events/names"
import { compactRecord } from "../../../../contracts/json"
import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type ActionCtx, internalAction } from "../../../_generated/server"
import { createIntegrationActor } from "../../../shared/actor"
import { readDataString } from "../../../shared/data"
import { readRecord, readString } from "../../../shared/input"
import { prepareIntegrationForRuntime } from "../../runtime"
import { requireLinearClientId } from "../oauth"
import {
  handleLinearApprovalDecision,
  isLinearApprovalDecision,
} from "./approvals"
import {
  getLinearMessage,
  getLinearReaction,
  type LinearWebhookPayload,
} from "./events"
import { fetchLinearIssueContext, type LinearIssueContext } from "./issues"
import { recordLinearLifecycleEvent } from "./lifecycle"
import { hydrateLinearNotification } from "./notifications"

export const process = internalAction({
  args: {
    integrationId: v.id("integrations"),
    connectionGeneration: v.number(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const envelope = readRecord(args.payload)
    const payload = readRecord(envelope.event) as LinearWebhookPayload
    const deliveryId = readString(envelope, "deliveryId") ?? null
    const integration: Doc<"integrations"> | null = await ctx.runQuery(
      internal.integrations.linear.profile.get,
      { integrationId: args.integrationId }
    )
    if (
      integration === null ||
      integration.externalId !== payload.organizationId ||
      (integration.connectionGeneration ?? 0) !== args.connectionGeneration
    ) {
      return
    }
    if (
      payload.oauthClientId !== undefined &&
      payload.oauthClientId !== requireLinearClientId()
    ) {
      return
    }
    if (
      payload.appUserId !== undefined &&
      payload.appUserId !== readDataString(integration.data, "botId")
    ) {
      return
    }
    if (payload.type === "OAuthApp" && payload.action === "revoked") {
      const occurredAt = Date.parse(payload.createdAt ?? "")
      if (
        !Number.isFinite(occurredAt) ||
        payload.oauthClientId !== requireLinearClientId()
      ) {
        return
      }
      await ctx.runMutation(internal.integrations.linear.profile.revoke, {
        integrationId: integration._id,
        observedAt: occurredAt,
        expectedConnectionGeneration: args.connectionGeneration,
      })
      return
    }
    const prepared =
      payload.type === "AppUserNotification"
        ? await prepareIntegrationForRuntime(ctx, { integration })
        : integration
    await processLinearEvent(
      ctx,
      await hydrateLinearNotification(prepared, payload),
      deliveryId,
      args.connectionGeneration
    )
  },
})

async function processLinearEvent(
  ctx: ActionCtx,
  payload: LinearWebhookPayload,
  deliveryId: string | null,
  connectionGeneration: number
) {
  const message = getLinearMessage({
    payload,
    deliveryId,
  })

  if (message !== null) {
    const hydratedMessage = await hydrateLinearMessage(ctx, message)

    if (isLinearApprovalDecision(hydratedMessage)) {
      await recordLinearMessage(
        ctx,
        hydratedMessage,
        connectionGeneration,
        "record"
      )
      await handleLinearApprovalDecision(
        ctx,
        hydratedMessage,
        connectionGeneration
      )
      return
    }

    await recordLinearMessage(ctx, hydratedMessage, connectionGeneration)

    return
  }

  const reaction = getLinearReaction({ payload })

  if (reaction !== null) {
    await recordLinearReaction(ctx, reaction, connectionGeneration)

    return
  }

  await recordLinearLifecycleEvent(ctx, {
    payload,
    deliveryId,
    expectedConnectionGeneration: connectionGeneration,
  })

  return
}

type LinearMessage = NonNullable<ReturnType<typeof getLinearMessage>>
type LinearReaction = NonNullable<ReturnType<typeof getLinearReaction>>
type LinearRecordMode = "record" | "record_and_run"

async function recordLinearMessage(
  ctx: ActionCtx,
  message: LinearMessage,
  connectionGeneration: number,
  mode?: LinearRecordMode
) {
  await ctx.runMutation(
    internal.integrations.linear.ingress.messages.record,
    compactRecord({
      accountId: message.accountId,
      expectedConnectionGeneration: connectionGeneration,
      appUserId: message.appUserId,
      mentioned: message.mentioned,
      mode,
      type: message.type,
      externalId: message.externalId,
      actor: createIntegrationActor({
        externalId: message.actorId,
        kind: message.actorKind,
        email: message.actorEmail,
        name: message.actorName,
      }),
      conversationId: message.conversationId,
      text: message.text,
      observedAt: message.observedAt,
      data: message.data,
    })
  )
}

async function recordLinearReaction(
  ctx: ActionCtx,
  reaction: LinearReaction,
  connectionGeneration: number
) {
  await ctx.runMutation(internal.reactions.intake.record, {
    accountId: reaction.accountId,
    expectedConnectionGeneration: connectionGeneration,
    integration: "linear",
    action: reaction.action,
    reaction: reaction.reaction,
    actor: createIntegrationActor({
      externalId: reaction.actorId,
      kind: "person",
      email: reaction.actorEmail,
      name: reaction.actorName,
    }),
    target: {
      key: reaction.target.key,
      identifiers: reaction.target.identifiers,
      actor: createIntegrationActor({
        externalId: reaction.target.actorId,
        kind: "person",
      }),
      conversationId: reaction.target.conversationId,
      text: reaction.target.text,
    },
    observedAt: reaction.observedAt,
  })
}

async function hydrateLinearMessage(
  ctx: ActionCtx,
  message: LinearMessage
): Promise<LinearMessage> {
  const event = linearIssueCommentEvent(message.data.action)

  if (event === undefined) {
    return message
  }

  if (message.data.projectId !== undefined) {
    return message
  }

  const plan = await ctx.runQuery(
    internal.integrations.linear.ingress.hydration.issueProject,
    {
      accountId: message.accountId,
      event,
      match: linearIssueMatch(message),
    }
  )

  if (plan.status !== "ready" || !plan.required) {
    return message
  }

  return withLinearIssueContext(
    message,
    await fetchLinearIssueContext(plan.integration, message.data.issueId)
  )
}

function linearIssueMatch(message: LinearMessage) {
  return compactRecord({
    issue: message.data.issueId,
    team: message.data.teamId,
  })
}

function withLinearIssueContext(
  message: LinearMessage,
  issue: LinearIssueContext | null
): LinearMessage {
  if (issue === null) {
    return message
  }

  return {
    ...message,
    data: {
      ...message.data,
      teamId: message.data.teamId ?? issue.teamId,
      projectId: message.data.projectId ?? issue.projectId,
    },
  }
}
