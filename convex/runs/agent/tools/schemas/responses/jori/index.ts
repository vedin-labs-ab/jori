import {
  automationJoriToolResponseSchemas,
  coreJoriToolResponseSchemas,
} from "./core"
import { storeToolResponseSchemas } from "./stores"
import { tableToolResponseSchemas } from "./tables"

export const joriToolResponseSchemas = {
  ...coreJoriToolResponseSchemas,
  ...tableToolResponseSchemas,
  ...storeToolResponseSchemas,
  ...automationJoriToolResponseSchemas,
}
