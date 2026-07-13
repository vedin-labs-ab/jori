import { type ToolPermissionRow } from "../types"
import { webToolPermissionRows } from "../web"
import { githubToolPermissionRows } from "./github"
import { googleToolPermissionRows } from "./google"
import { linearToolPermissionRows } from "./linear"
import { microsoftToolPermissionRows } from "./microsoft"
import { miloToolPermissionRows } from "./milo"
import { nativeToolPermissionRows } from "./native"
import { notionToolPermissionRows } from "./notion"
import { slackToolPermissionRows } from "./slack"

export const toolPermissionRows = [
  ...nativeToolPermissionRows,
  ...miloToolPermissionRows,
  ...webToolPermissionRows,
  ...slackToolPermissionRows,
  ...linearToolPermissionRows,
  ...githubToolPermissionRows,
  ...googleToolPermissionRows,
  ...notionToolPermissionRows,
  ...microsoftToolPermissionRows,
] satisfies ToolPermissionRow[]
