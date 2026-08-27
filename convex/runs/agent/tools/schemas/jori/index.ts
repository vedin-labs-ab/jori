import { appToolInputSchemas } from "./apps"
import { automationJoriToolInputSchemas } from "./automations"
import { coreJoriToolInputSchemas } from "./core"
import { storeToolInputSchemas } from "./stores"
import { tableToolInputSchemas } from "./tables"

export const joriToolInputSchemas = {
  ...coreJoriToolInputSchemas,
  ...appToolInputSchemas,
  ...tableToolInputSchemas,
  ...storeToolInputSchemas,
  ...automationJoriToolInputSchemas,
}
