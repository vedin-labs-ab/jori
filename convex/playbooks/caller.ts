import { v } from "convex/values"
import { compactRecord } from "../../contracts/json"
import { type DeliveryChoice } from "../../contracts/playbooks/delivery"
import { type PlaybookOptionValues } from "../../contracts/playbooks/options"
import { readUserEmail, readUserName } from "../access/users"
import { type Integration, integrationValidator } from "../shared/integrations"
import { type PlaybookPlanArgs } from "./plan"
import { deliveryChoiceValidator } from "./schema"

export type PlaybookCallerArgs = {
  organizationId: string
  playbook: string
  choices?: Record<string, Integration>
  destination: DeliveryChoice
  options?: PlaybookOptionValues
}

export const playbookPlanFields = {
  organizationId: v.string(),
  playbook: v.string(),
  choices: v.optional(v.record(v.string(), integrationValidator)),
  destination: deliveryChoiceValidator,
  options: v.optional(
    v.record(v.string(), v.union(v.boolean(), v.string(), v.number()))
  ),
}

export function playbookPlanArgs(
  args: PlaybookCallerArgs,
  createdBy: PlaybookPlanArgs["createdBy"],
  recipient: PlaybookPlanArgs["recipient"],
  artifactId?: PlaybookPlanArgs["artifactId"]
): PlaybookPlanArgs {
  return {
    organizationId: args.organizationId,
    key: args.playbook,
    choices: args.choices ?? {},
    destination: args.destination,
    options: args.options,
    createdBy,
    recipient,
    artifactId,
  }
}

export function callerRecipient(identity: {
  email?: string
  name?: string
}): PlaybookPlanArgs["recipient"] {
  return compactRecord({
    email: readUserEmail(identity),
    name: readUserName(identity),
  })
}
