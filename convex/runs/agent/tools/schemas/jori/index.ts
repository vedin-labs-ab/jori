import { appToolInputSchemas } from "./apps"
import { automationJoriToolInputSchemas } from "./automations"
import { coreJoriToolInputSchemas } from "./core"

export const joriToolInputSchemas = {
  ...coreJoriToolInputSchemas,
  ...appToolInputSchemas,
  ...automationJoriToolInputSchemas,
}
