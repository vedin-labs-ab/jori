import { v } from "convex/values"

export const providers = [
  "milo",
  "slack",
  "linear",
  "github",
  "gmail",
  "googleCalendar",
  "googleDrive",
  "notion",
  "microsoftEmail",
  "microsoftCalendar",
] as const

export const integrationProviders = providers.filter(
  (provider) => provider !== "milo"
) as Exclude<Provider, "milo">[]

export type Provider = (typeof providers)[number]
export type IntegrationProvider = Exclude<Provider, "milo">

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
