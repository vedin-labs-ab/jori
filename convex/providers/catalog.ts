import { v } from "convex/values"

export {
  type Provider,
  providerLabel,
  providers,
} from "../../contracts/providers"

export const providerValidator = v.union(
  v.literal("google"),
  v.literal("microsoft"),
  v.literal("github"),
  v.literal("slack"),
  v.literal("notion"),
  v.literal("linear")
)
