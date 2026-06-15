import { v } from "convex/values"

export {
  type Integration,
  integrationLabel,
  integrationLabels,
  integrationProviders,
  integrations,
  isGoogleIntegration,
  isMicrosoftIntegration,
  isUserScopedIntegration,
  providerForIntegration,
  type ToolSurface,
  toolSurfaceLabel,
  toolSurfaces,
} from "../../contracts/integrations"

export const integrationValidator = v.union(
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

export const toolSurfaceValidator = v.union(
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
