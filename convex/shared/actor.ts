import { v } from "convex/values"

export type ActorKind = "bot" | "self" | "user"
export type ActorAlias = { type: string; id: string }

export type Actor =
  | { kind: "user"; userId: string; name?: string; email?: string }
  | { kind: "user"; email: string }
  | {
      kind: ActorKind
      externalId: string
      aliases?: ActorAlias[]
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
    externalId: v.string(),
    aliases: v.optional(
      v.array(v.object({ type: v.string(), id: v.string() }))
    ),
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

  if ("externalId" in actor) {
    if (actor.kind === "self") {
      return "Milo"
    }

    return actor.name ?? actor.email ?? actor.externalId
  }

  if ("userId" in actor) {
    return actor.name ?? actor.email ?? actor.userId
  }

  return actor.email
}

export function isUserActor(actor: Actor | undefined) {
  return actor?.kind === "user"
}

export function getActorExternalId(actor: Actor | undefined) {
  return actor !== undefined && "externalId" in actor
    ? actor.externalId
    : undefined
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
  externalId?: string
  aliases?: ActorAlias[]
  kind?: ActorKind
  name?: string
  email?: string
}): Actor | undefined {
  if (args.externalId !== undefined && args.externalId !== "") {
    return {
      kind: args.kind ?? "user",
      externalId: args.externalId,
      ...nonEmptyAliases(args.aliases),
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

function nonEmptyAliases(aliases: ActorAlias[] | undefined) {
  const values = aliases?.filter(
    (alias) => alias.id !== "" && alias.type !== ""
  )

  return values === undefined || values.length === 0 ? {} : { aliases: values }
}

export function withActorKind(
  actor: Actor | undefined,
  kind: ActorKind
): Actor | undefined {
  if (actor === undefined || !("externalId" in actor)) {
    return actor
  }

  return { ...actor, kind }
}
