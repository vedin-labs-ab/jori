import { artifactToolResponseSchemas } from "./artifacts"
import {
  automationMiloToolResponseSchemas,
  coreMiloToolResponseSchemas,
} from "./core"

export const miloToolResponseSchemas = {
  ...coreMiloToolResponseSchemas,
  ...artifactToolResponseSchemas,
  ...automationMiloToolResponseSchemas,
}
