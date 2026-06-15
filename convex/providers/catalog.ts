import { v } from "convex/values"

export {
  type IntegrationProvider,
  integrationProviders,
  isGoogleProvider,
  isMicrosoftProvider,
  isUserScopedProvider,
  type Provider,
  providerLabel,
  providers,
} from "../../contracts/providers"

export const providerValidator = v.union(
  v.literal("milo"),
  v.literal("slack"),
  v.literal("linear"),
  v.literal("github"),
  v.literal("gmail"),
  v.literal("googleCalendar"),
  v.literal("googleDrive"),
  v.literal("notion"),
  v.literal("microsoftEmail"),
  v.literal("microsoftCalendar")
)

export const integrationProviderValidator = v.union(
  v.literal("slack"),
  v.literal("linear"),
  v.literal("github"),
  v.literal("gmail"),
  v.literal("googleCalendar"),
  v.literal("googleDrive"),
  v.literal("notion"),
  v.literal("microsoftEmail"),
  v.literal("microsoftCalendar")
)
