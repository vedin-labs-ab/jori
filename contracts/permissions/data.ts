import { githubToolPermissionRows } from "./github"
import { googleToolPermissionRows } from "./google"
import { type ToolPermissionRow } from "./index"
import { linearToolPermissionRows } from "./linear"
import { microsoftToolPermissionRows } from "./microsoft"
import { miloToolPermissionRows } from "./milo"
import { notionToolPermissionRows } from "./notion"
import { slackToolPermissionRows } from "./slack"
import { webToolPermissionRows } from "./web"

export const toolPermissionRows = [
  ...miloToolPermissionRows,
  ...webToolPermissionRows,
  ...slackToolPermissionRows,
  ...linearToolPermissionRows,
  ...githubToolPermissionRows,
  ...googleToolPermissionRows,
  ...notionToolPermissionRows,
  ...microsoftToolPermissionRows,
] satisfies ToolPermissionRow[]
