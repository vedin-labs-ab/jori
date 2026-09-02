import { availableJobEventCatalog } from "./available"
import { pendingJobEventCatalog } from "./pending"
import { type JobEventIntegrationDefinition } from "./types"

export const jobEventCatalog = [
  ...availableJobEventCatalog,
  ...pendingJobEventCatalog,
] as const satisfies readonly JobEventIntegrationDefinition[]
