import { coreJoriToolInputSchemas } from "./core"
import { jobJoriToolInputSchemas } from "./jobs"
import { storeToolInputSchemas } from "./stores"
import { tableToolInputSchemas } from "./tables"

export const joriToolInputSchemas = {
  ...coreJoriToolInputSchemas,
  ...tableToolInputSchemas,
  ...storeToolInputSchemas,
  ...jobJoriToolInputSchemas,
}
