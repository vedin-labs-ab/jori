import { v } from "convex/values"
import { type Integration, integrationValidator } from "./integrations"

export type ActorKind = "bot" | "self" | "user"

export type Actor =
  | { kind: "user"; userId: string; name?: string; email?: string }
  | { kind: "user"; email: string }
  | {
      kind: ActorKind
      integration: Integration
      externalId: string
      name?: string
      email?: string
    }

export const actorKindValidator = v.union(
  v.literal("bot"),
  v.literal("self"),
  v.literal("user")
)

export const actorValidator = v.union(
  v.object({
    kind: v.literal("user"),
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("user"),
    email: v.string(),
  }),
  v.object({
    kind: actorKindValidator,
    integration: integrationValidator,
    externalId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  })
)

export function createUserActor(
  userId: string,
  profile?: { name?: string; email?: string }
): Actor
export function createUserActor(userId: undefined): undefined
export function createUserActor(
  userId: string | undefined,
  profile?: { name?: string; email?: string }
): Actor | undefined
export function createUserActor(
  userId: string | undefined,
  profile: { name?: string; email?: string } = {}
): Actor | undefined {
  if (userId === undefined) {
    return undefined
  }

  return {
    kind: "user",
    userId,
    ...nonEmptyActorFields(profile),
  }
}

export function getActorEmail(actor: Actor | undefined) {
  return actor !== undefined && "email" in actor ? actor.email : undefined
}

export function getActorDisplayName(actor: Actor | undefined) {
  if (actor === undefined) {
    return undefined
  }

  if ("integration" in actor) {
    if (actor.kind === "self") {
      return "Milo"
    }

    return (
      actor.name ??
      actor.email ??
      (actor.integration === "slack"
        ? `<@${actor.externalId}>`
        : actor.externalId)
    )
  }

  if ("userId" in actor) {
    return actor.name ?? actor.email ?? actor.userId
  }

  return actor.email
}

export function isUserActor(actor: Actor | undefined) {
  return actor?.kind === "user"
}

export function getActorExternalId(
  actor: Actor | undefined,
  integration: Integration
) {
  if (
    actor === undefined ||
    !("integration" in actor) ||
    actor.integration !== integration
  ) {
    return undefined
  }

  return actor.externalId
}

function nonEmptyActorFields(fields: { name?: string; email?: string }) {
  return {
    ...(fields.name === undefined || fields.name === ""
      ? {}
      : { name: fields.name }),
    ...(fields.email === undefined || fields.email === ""
      ? {}
      : { email: fields.email }),
  }
}

export function createIntegrationActor(args: {
  integration: Integration
  externalId?: string
  kind?: ActorKind
  name?: string
  email?: string
}): Actor | undefined {
  if (args.externalId !== undefined && args.externalId !== "") {
    return {
      kind: args.kind ?? "user",
      integration: args.integration,
      externalId: args.externalId,
      ...nonEmptyActorFields({
        email: args.email,
        name: args.name,
      }),
    }
  }

  if (args.email !== undefined && args.email !== "") {
    return { kind: "user", email: args.email }
  }

  return undefined
}

export function withActorKind(
  actor: Actor | undefined,
  kind: ActorKind
): Actor | undefined {
  if (actor === undefined || !("integration" in actor)) {
    return actor
  }

  return { ...actor, kind }
}
