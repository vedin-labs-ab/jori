import { appToolInputSchemas } from "./apps"
import { automationMiloToolInputSchemas } from "./automations"
import { coreMiloToolInputSchemas } from "./core"

export const miloToolInputSchemas = {
  ...coreMiloToolInputSchemas,
  ...appToolInputSchemas,
  ...automationMiloToolInputSchemas,
}
