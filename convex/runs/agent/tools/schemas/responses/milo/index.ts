import { appToolResponseSchemas } from "./apps"
import {
  automationMiloToolResponseSchemas,
  coreMiloToolResponseSchemas,
} from "./core"

export const miloToolResponseSchemas = {
  ...coreMiloToolResponseSchemas,
  ...appToolResponseSchemas,
  ...automationMiloToolResponseSchemas,
}
