import { v } from "convex/values"
import {
  type IntegrationProvider,
  integrationProviderValidator,
} from "../providers/catalog"

type ActorFields = {
  userId?: string
  provider?: IntegrationProvider
  externalId?: string
  email?: string
}

export type Actor =
  | (ActorFields & { userId: string })
  | (ActorFields & { provider: IntegrationProvider; externalId: string })
  | (ActorFields & { email: string })

const actorFields = {
  provider: v.optional(integrationProviderValidator),
  userId: v.optional(v.string()),
  externalId: v.optional(v.string()),
  email: v.optional(v.string()),
}

export const actorValidator = v.union(
  v.object({
    ...actorFields,
    userId: v.string(),
  }),
  v.object({
    ...actorFields,
    provider: integrationProviderValidator,
    externalId: v.string(),
  }),
  v.object({
    ...actorFields,
    email: v.string(),
  })
)
