import { artifactToolInputSchemas } from "../artifacts"
import { automationMiloToolInputSchemas } from "./automations"
import { coreMiloToolInputSchemas } from "./core"

export const miloToolInputSchemas = {
  ...coreMiloToolInputSchemas,
  ...artifactToolInputSchemas,
  ...automationMiloToolInputSchemas,
}
