import { v } from "convex/values"
import {
  type IntegrationProvider,
  integrationProviderValidator,
} from "../providers/catalog"

export type Actor =
  | { userId: string }
  | { email: string }
  | { provider: IntegrationProvider; externalId: string }

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
  })
)
