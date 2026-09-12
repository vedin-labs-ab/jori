import { coreJoriToolResponseSchemas } from "./core"
import { jobJoriToolResponseSchemas } from "./jobs"
import { storeToolResponseSchemas } from "./stores"
import { tableToolResponseSchemas } from "./tables"

export const joriToolResponseSchemas = {
  ...coreJoriToolResponseSchemas,
  ...tableToolResponseSchemas,
  ...storeToolResponseSchemas,
  ...jobJoriToolResponseSchemas,
}
