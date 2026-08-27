import { automationJoriToolInputSchemas } from "./automations"
import { coreJoriToolInputSchemas } from "./core"
import { storeToolInputSchemas } from "./stores"
import { tableToolInputSchemas } from "./tables"

export const joriToolInputSchemas = {
  ...coreJoriToolInputSchemas,
  ...tableToolInputSchemas,
  ...storeToolInputSchemas,
  ...automationJoriToolInputSchemas,
}
