import { v } from "convex/values"
import {
  type IntegrationProvider,
  integrationProviderValidator,
} from "../providers/catalog"

export type Actor =
  | { userId: string }
  | { email: string }
  | { provider: IntegrationProvider; externalId: string; email?: string }

export const actorValidator = v.union(
  v.object({
    userId: v.string(),
  }),
  v.object({
    email: v.string(),
  }),
  v.object({
    provider: integrationProviderValidator,
    externalId: v.string(),
    email: v.optional(v.string()),
  })
)

export function createUserActor(userId: string): Actor
export function createUserActor(userId: undefined): undefined
export function createUserActor(userId: string | undefined): Actor | undefined
export function createUserActor(userId: string | undefined): Actor | undefined {
  return userId === undefined ? undefined : { userId }
}

export function getActorEmail(actor: Actor | undefined) {
  return actor !== undefined && "email" in actor ? actor.email : undefined
}

export function getActorExternalId(
  actor: Actor | undefined,
  provider: IntegrationProvider
) {
  if (
    actor === undefined ||
    !("provider" in actor) ||
    actor.provider !== provider
  ) {
    return undefined
  }

  return actor.externalId
}

export function createProviderActor(args: {
  provider: IntegrationProvider
  externalId?: string
  email?: string
}): Actor | undefined {
  if (args.externalId !== undefined && args.externalId !== "") {
    const actor: Actor = {
      provider: args.provider,
      externalId: args.externalId,
    }

    return args.email === undefined || args.email === ""
      ? actor
      : { ...actor, email: args.email }
  }

  if (args.email !== undefined && args.email !== "") {
    return { email: args.email }
  }

  return undefined
}
