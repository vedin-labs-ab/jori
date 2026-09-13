import { type Infer, v } from "convex/values"
import { type Id } from "../_generated/dataModel"

const actorKindValidator = v.union(
  v.literal("bot"),
  v.literal("person"),
  v.literal("self")
)

const actorAliasValidator = v.object({ type: v.string(), id: v.string() })

export const actorValidator = v.union(
  v.object({
    kind: v.literal("person"),
    personId: v.id("persons"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("person"),
    email: v.string(),
  }),
  v.object({
    kind: actorKindValidator,
    externalId: v.string(),
    aliases: v.optional(v.array(actorAliasValidator)),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  })
)

export type ActorKind = Infer<typeof actorKindValidator>
export type ActorAlias = Infer<typeof actorAliasValidator>
export type Actor = Infer<typeof actorValidator>

export function createPersonActor(
  personId: Id<"persons">,
  profile?: { name?: string; email?: string }
): Actor
export function createPersonActor(personId: undefined): undefined
export function createPersonActor(
  personId: Id<"persons"> | undefined,
  profile?: { name?: string; email?: string }
): Actor | undefined
export function createPersonActor(
  personId: Id<"persons"> | undefined,
  profile: { name?: string; email?: string } = {}
): Actor | undefined {
  if (personId === undefined) {
    return undefined
  }

  return {
    kind: "person",
    personId,
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
      return "Jori"
    }

    return actor.name ?? actor.email ?? actor.externalId
  }

  if ("personId" in actor) {
    return actor.name ?? actor.email ?? actor.personId
  }

  return actor.email
}

/** An absent actor reads as an unknown speaker. */
export function getActorKind(actor: Actor | undefined) {
  return actor?.kind ?? "unknown"
}

export function isPersonActor(actor: Actor | undefined) {
  return actor?.kind === "person"
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
      kind: args.kind ?? "person",
      externalId: args.externalId,
      ...nonEmptyAliases(args.aliases),
      ...nonEmptyActorFields({
        email: args.email,
        name: args.name,
      }),
    }
  }

  if (args.email !== undefined && args.email !== "") {
    return { kind: "person", email: args.email }
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
