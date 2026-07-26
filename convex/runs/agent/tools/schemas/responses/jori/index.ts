import { appToolResponseSchemas } from "./apps"
import {
  automationJoriToolResponseSchemas,
  coreJoriToolResponseSchemas,
} from "./core"

export const joriToolResponseSchemas = {
  ...coreJoriToolResponseSchemas,
  ...appToolResponseSchemas,
  ...automationJoriToolResponseSchemas,
}
