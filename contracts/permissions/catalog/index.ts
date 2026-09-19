import { type ToolPermissionRow } from "../types"
import { webToolPermissionRows } from "../web"
import { githubToolPermissionRows } from "./github"
import { googleToolPermissionRows } from "./google"
import { joriToolPermissionRows } from "./jori"
import { linearToolPermissionRows } from "./linear"
import { materialToolPermissionRows } from "./materials"
import { microsoftToolPermissionRows } from "./microsoft"
import { nativeToolPermissionRows } from "./native"
import { notionToolPermissionRows } from "./notion"
import { slackToolPermissionRows } from "./slack"

// Lists read in this order, so Jori's own tools go from the organization's
// materials out to the open-ended ones a person grants last: the web, then
// the sandbox and agents.
export const toolPermissionRows = [
  ...materialToolPermissionRows,
  ...joriToolPermissionRows,
  ...webToolPermissionRows,
  ...nativeToolPermissionRows,
  ...slackToolPermissionRows,
  ...linearToolPermissionRows,
  ...githubToolPermissionRows,
  ...googleToolPermissionRows,
  ...notionToolPermissionRows,
  ...microsoftToolPermissionRows,
] satisfies ToolPermissionRow[]
