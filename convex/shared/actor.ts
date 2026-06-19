import { v } from "convex/values"
import { type Integration, integrationValidator } from "./integrations"

export type Actor =
  | { userId: string; name?: string; email?: string }
  | { email: string }
  | {
      integration: Integration
      externalId: string
      name?: string
      email?: string
    }

export const actorValidator = v.union(
  v.object({
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
  v.object({
    email: v.string(),
  }),
  v.object({
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
  name?: string
  email?: string
}): Actor | undefined {
  if (args.externalId !== undefined && args.externalId !== "") {
    return {
      integration: args.integration,
      externalId: args.externalId,
      ...nonEmptyActorFields({
        email: args.email,
        name: args.name,
      }),
    }
  }

  if (args.email !== undefined && args.email !== "") {
    return { email: args.email }
  }

  return undefined
}
