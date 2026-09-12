import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"
import {
  type ReactionAction,
  type ReactionSnapshotItem,
  type ReactionTarget,
  reactionActorKey,
} from "./data"

const maxReactionsPerTarget = 500

type ReactionTargetState = {
  byKey: Map<string, Doc<"reactions">>
  target: ReactionTarget
  integration: Doc<"integrations">
  rows: Doc<"reactions">[]
}

type PresenceInput = {
  actor?: Actor
  observedAt?: number
  present: boolean
  reaction: string
}

export async function reconcileTargetReactions(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    target: ReactionTarget
    reactions: ReactionSnapshotItem[]
  }
) {
  const state = await loadReactionTargetState(
    ctx,
    args.integration,
    args.target
  )
  const present = new Map<string, ReactionSnapshotItem>()

  for (const item of args.reactions) {
    present.set(presenceKey(item.actor, item.reaction), item)
  }

  let recorded = 0

  for (const item of present.values()) {
    if (await applyPresence(ctx, state, { ...item, present: true })) {
      recorded += 1
    }
  }

  for (const row of state.rows) {
    if (row.removedAt !== undefined || present.has(rowKey(row))) {
      continue
    }

    if (await applyPresence(ctx, state, rowAbsence(row))) {
      recorded += 1
    }
  }

  return { active: present.size, recorded }
}

export async function recordReactionEvent(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    target: ReactionTarget
    actor?: Actor
    reaction: string
    action: ReactionAction
    observedAt?: number
  }
) {
  const state = await loadReactionTargetState(
    ctx,
    args.integration,
    args.target
  )
  const changed = await applyPresence(ctx, state, {
    actor: args.actor,
    observedAt: args.observedAt,
    present: args.action === "added",
    reaction: args.reaction,
  })

  return { recorded: changed ? 1 : 0 }
}

async function loadReactionTargetState(
  ctx: MutationCtx,
  integration: Doc<"integrations">,
  target: ReactionTarget
): Promise<ReactionTargetState> {
  const rows = await ctx.db
    .query("reactions")
    .withIndex("by_integration_and_target_key", (query) =>
      query.eq("integrationId", integration._id).eq("target.key", target.key)
    )
    .take(maxReactionsPerTarget)
  const byKey = new Map(rows.map((row) => [rowKey(row), row]))

  return { byKey, target, integration, rows }
}

async function applyPresence(
  ctx: MutationCtx,
  state: ReactionTargetState,
  input: PresenceInput
) {
  const existing = state.byKey.get(presenceKey(input.actor, input.reaction))

  if (input.present) {
    return await activateReaction(ctx, state, existing, input)
  }

  if (existing === undefined || existing.removedAt !== undefined) {
    return false
  }

  await ctx.db.patch(existing._id, {
    removedAt: input.observedAt ?? Date.now(),
    updatedAt: nextUpdatedAt(existing.updatedAt),
  })

  return true
}

async function activateReaction(
  ctx: MutationCtx,
  state: ReactionTargetState,
  existing: Doc<"reactions"> | undefined,
  input: PresenceInput
) {
  if (existing === undefined) {
    await ctx.db.insert("reactions", newReactionRow(state, input))
    return true
  }

  if (existing.removedAt === undefined) {
    return false
  }

  await ctx.db.patch(existing._id, {
    observedAt: input.observedAt ?? Date.now(),
    removedAt: undefined,
    updatedAt: nextUpdatedAt(existing.updatedAt),
  })

  return true
}

function newReactionRow(state: ReactionTargetState, input: PresenceInput) {
  const now = Date.now()

  return {
    actor: input.actor,
    createdAt: now,
    integration: state.integration.integration,
    integrationId: state.integration._id,
    observedAt: input.observedAt ?? now,
    reaction: input.reaction,
    target: {
      actor: state.target.actor,
      conversationId: state.target.conversationId,
      identifiers: state.target.identifiers,
      key: state.target.key,
      text: state.target.text,
    },
    organizationId: state.integration.organizationId,
    updatedAt: now,
  }
}

function rowAbsence(row: Doc<"reactions">): PresenceInput {
  return { actor: row.actor, present: false, reaction: row.reaction }
}

function presenceKey(actor: Actor | undefined, reaction: string) {
  return `${reactionActorKey(actor)}:${reaction}`
}

function rowKey(row: Doc<"reactions">) {
  return presenceKey(row.actor, row.reaction)
}

function nextUpdatedAt(previous: number) {
  return Math.max(previous + 1, Date.now())
}
